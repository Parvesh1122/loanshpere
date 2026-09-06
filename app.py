"""
LoanSphere - Flask API Backend
Hybrid model: ML prediction (GaussianNB) blended with heuristic rules.
"""
import os, pickle, time, json
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from bank_rates import get_bank_rates
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import accuracy_score

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "features.pkl")

app = Flask(__name__)
CORS(app)

# ============================== TRAINING ==============================
def train_model():
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), "loan_approval_data.csv"))
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()
    numerical_cols = df.select_dtypes(include=["float64", "int64"]).columns.tolist()
    df = df.drop("Applicant_ID", axis=1)
    numerical_cols.remove("Applicant_ID")

    num_imp = SimpleImputer(strategy="mean")
    df[numerical_cols] = num_imp.fit_transform(df[numerical_cols])
    cat_imp = SimpleImputer(strategy="most_frequent")
    df[categorical_cols] = cat_imp.fit_transform(df[categorical_cols])

    le_edu = LabelEncoder()
    df["Education_Level"] = le_edu.fit_transform(df["Education_Level"])
    le_target = LabelEncoder()
    df["Loan_Approved"] = le_target.fit_transform(df["Loan_Approved"])

    ohe_cols = ["Employment_Status", "Marital_Status", "Loan_Purpose", "Property_Area", "Gender", "Employer_Category"]
    ohe = OneHotEncoder(drop="first", sparse_output=False, handle_unknown="ignore")
    encoded = ohe.fit_transform(df[ohe_cols])
    encoded_df = pd.DataFrame(encoded, columns=ohe.get_feature_names_out(ohe_cols), index=df.index)
    df = pd.concat([df.drop(columns=ohe_cols), encoded_df], axis=1)

    X = df.drop("Loan_Approved", axis=1)
    y = df["Loan_Approved"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    model = GaussianNB()
    model.fit(X_train_scaled, y_train)

    X_test_scaled = scaler.transform(X_test)
    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"[LoanSphere] Model accuracy: {acc:.4f}")

    meta = {
        "columns": X.columns.tolist(),
        "numerical_cols": numerical_cols,
        "num_stats": {c: {"mean": float(df[c].mean()), "std": float(df[c].std()), "max": float(df[c].max()), "min": float(df[c].min())} for c in numerical_cols},
        "le_edu": le_edu, "le_target": le_target, "ohe": ohe, "ohe_cols": ohe_cols,
        "num_imp": num_imp, "cat_imp": cat_imp, "accuracy": float(acc),
    }
    with open(MODEL_PATH, "wb") as f: pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f: pickle.dump(scaler, f)
    with open(FEATURES_PATH, "wb") as f: pickle.dump(meta, f)
    print(f"[LoanSphere] Model saved to {MODEL_PATH}")
    return model, scaler, meta

def load_model():
    if all(os.path.exists(p) for p in [MODEL_PATH, SCALER_PATH, FEATURES_PATH]):
        with open(MODEL_PATH, "rb") as f: model = pickle.load(f)
        with open(SCALER_PATH, "rb") as f: scaler = pickle.load(f)
        with open(FEATURES_PATH, "rb") as f: meta = pickle.load(f)
        print("[LoanSphere] Model loaded from disk")
        return model, scaler, meta
    print("[LoanSphere] Training new model...")
    return train_model()

model, scaler, meta = load_model()

# ============================== HELPER: Build feature row ==============================
def build_feature_row(data):
    """Convert frontend form data to model feature vector, clipping extreme values."""
    income = float(data.get("monthlyIncome", 0))
    loan_amount = float(data.get("loanAmount", 0))
    existing_loans_map = {"none": 0, "one": 1, "two": 3}
    existing_loans = existing_loans_map.get(data.get("existingLoans", "none"), 0)
    loan_term = int(data.get("loanDuration", 5)) * 12
    dti = round(loan_amount / (income * 12 + 1), 2) if income > 0 else 0.5

    # Clip extreme values to training data range × multiplier for safety
    stats = meta.get("num_stats", {})
    def clip_val(name, val):
        if name in stats:
            s = stats[name]
            lo = s["min"] * 0.5
            hi = s["max"] * 2.0  # allow up to 2x training max
            return max(lo, min(hi, val))
        return val

    numerical = {
        "Applicant_Income": clip_val("Applicant_Income", income),
        "Coapplicant_Income": 0.0,
        "Age": clip_val("Age", float(data.get("age", 30))),
        "Dependents": clip_val("Dependents", 0.0),
        "Credit_Score": clip_val("Credit_Score", float(data.get("creditScore", 600))),
        "Existing_Loans": clip_val("Existing_Loans", float(existing_loans)),
        "DTI_Ratio": clip_val("DTI_Ratio", dti),
        "Savings": clip_val("Savings", income * 0.2),
        "Collateral_Value": 0.0,
        "Loan_Amount": clip_val("Loan_Amount", loan_amount),
        "Loan_Term": clip_val("Loan_Term", float(loan_term)),
    }

    emp_type_map = {
        "salaried": "Salaried", "self-employed": "Self-employed",
        "business": "Self-employed", "freelancer": "Self-employed",
    }
    emp_cat_map = {
        "salaried": "Private", "self-employed": "Business",
        "business": "Business", "freelancer": "Business",
    }
    raw_cats = pd.DataFrame([{
        "Employment_Status": emp_type_map.get(data.get("employmentType", ""), "Salaried"),
        "Marital_Status": data.get("maritalStatus", "Single"),
        "Loan_Purpose": data.get("loanPurpose", "Personal"),
        "Property_Area": data.get("propertyArea", "Urban"),
        "Gender": data.get("gender", "Male"),
        "Employer_Category": emp_cat_map.get(data.get("employmentType", ""), "Private"),
    }])

    ohe = meta["ohe"]
    encoded = ohe.transform(raw_cats[meta["ohe_cols"]])
    encoded_df = pd.DataFrame(encoded, columns=ohe.get_feature_names_out(meta["ohe_cols"]))

    le_edu = meta["le_edu"]
    edu_raw = data.get("educationLevel", "Graduate")
    try:
        edu_encoded = le_edu.transform([edu_raw])[0]
    except Exception:
        edu_encoded = 1.0
    numerical["Education_Level"] = float(edu_encoded)

    row = {**numerical}
    for col in encoded_df.columns:
        row[col] = float(encoded_df.iloc[0][col])
    return row


# ============================== HYBRID PREDICTOR ==============================
def hybrid_predict(data):
    """
    Combine ML model with heuristic rules for robust predictions.
    Returns (category, approval_pct, risk_level, suggested_amount, suggested_rate)
    """
    income = float(data.get("monthlyIncome", 0))
    loan_amount = float(data.get("loanAmount", 0))
    credit_score = int(data.get("creditScore", 600))
    existing_loans = data.get("existingLoans", "none")

    # ---- HEURISTIC SCORE (0-100) ----
    score = 0
    # Income component (max 35 points)
    if income >= 75000: score += 35
    elif income >= 50000: score += 28
    elif income >= 35000: score += 20
    elif income >= 20000: score += 12
    else: score += 5

    # Credit score component (max 35 points)
    if credit_score > 750: score += 35
    elif credit_score > 700: score += 30
    elif credit_score > 650: score += 22
    elif credit_score > 600: score += 15
    elif credit_score > 550: score += 8
    else: score += 3

    # Existing loans penalty (max -10)
    if existing_loans == "two": score -= 10
    elif existing_loans == "one": score -= 5

    # DTI check (loan amount / annual income) - max -10
    if income > 0:
        dti_ratio = loan_amount / (income * 12)
        if dti_ratio > 5: score -= 10
        elif dti_ratio > 3: score -= 5

    # Age bonus (max 5)
    age = int(data.get("age", 30))
    if 25 <= age <= 55: score += 5

    # Employment bonus (max 5)
    emp = data.get("employmentType", "")
    if emp in ["salaried", "business"]: score += 5

    score = max(0, min(100, score))

    # ---- ML PREDICTION (clipped inputs) ----
    try:
        row = build_feature_row(data)
        expected_cols = meta["columns"]
        df_input = pd.DataFrame([row]).reindex(columns=expected_cols, fill_value=0.0)
        scaled = scaler.transform(df_input.values)
        ml_prob = model.predict_proba(scaled)[0][1]  # probability of "Yes"
        ml_score = ml_prob * 100
    except Exception as e:
        print(f"[LoanSphere] ML prediction error: {e}")
        ml_score = 50  # neutral fallback

    # ---- ADAPTIVE BLENDING ----
    # When inputs are far from training distribution, rely more on heuristic
    stats = meta.get("num_stats", {})
    income = float(data.get("monthlyIncome", 0))
    loan_amt = float(data.get("loanAmount", 0))
    out_of_range = 0
    if "Applicant_Income" in stats:
        s = stats["Applicant_Income"]
        if income > s["max"] * 1.5: out_of_range += 1
    if "Loan_Amount" in stats:
        s = stats["Loan_Amount"]
        if loan_amt > s["max"] * 1.5: out_of_range += 1

    ml_weight = 0.15 if out_of_range >= 1 else 0.40
    blended = ml_weight * ml_score + (1 - ml_weight) * score

    # ---- DETERMINE CATEGORY ----
    if blended >= 65:
        category = "eligible"
        risk = "Low Risk"
        suggested = min(loan_amount or 500000, income * 12 * 5) if income > 0 else (loan_amount or 500000)
        rate = "7.5% - 8.5%"
    elif blended >= 35:
        category = "partial"
        risk = "Medium Risk"
        suggested = min(loan_amount or 300000, income * 12 * 3) if income > 0 else (loan_amount or 300000)
        rate = "10% - 12%"
    else:
        category = "not-eligible"
        risk = "High Risk"
        suggested = 0
        rate = "N/A"

    return category, round(blended, 1), risk, round(suggested), rate


# ============================== ROUTES ==============================
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "Hybrid (GaussianNB + Heuristic)", "accuracy": meta.get("accuracy", 0)})

@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        category, blended, risk, suggested_amount, rate = hybrid_predict(data)

        return jsonify({
            "category": category,
            "approval_pct": blended,
            "risk_level": risk,
            "suggested_amount": suggested_amount,
            "suggested_rate": rate,
            "message": f"Loan assessment: {category}",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================== BANK RATES ==============================
@app.route("/api/banks", methods=["GET"])
def bank_rates():
    """Return live bank interest rates (scraped + cached)."""
    try:
        data, timestamp = get_bank_rates()
        return jsonify({
            "banks": data,
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
            "source": "live",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================== MAIN ==============================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
