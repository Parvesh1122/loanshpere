LoanSphere

LoanSphere is an AI/ML-powered loan eligibility and financial planning
web application. It analyzes an applicant's financial profile, estimates
loan eligibility and risk, provides a suggested loan amount and interest
rate, and offers tools for EMI calculation and bank-rate comparison.

Features

AI/ML Loan Eligibility Prediction using a Gaussian Naive Bayes
model.

Hybrid Decision System that blends the ML prediction with
rule-based financial heuristics.

Risk Assessment with Low Risk, Medium Risk, and High Risk
categories.

Loan Amount & Rate Suggestions based on the assessment.

EMI Calculator with simple-interest and reducing-balance
calculations.

Bank Interest Rate Comparison with live scraping and cached
fallback data.

Personalized Recommendations for banks, EMI planning, and
financial tips.

PDF Report and Voice Output for eligibility results.

Responsive web interface with a modern dark-theme design.

The frontend presents loan eligibility, EMI calculator, bank rates,
recommendations, features, FAQ, and contact sections in one application.

AI/ML Workflow

The backend loads the loan dataset and performs preprocessing before
training the model:

Missing numerical values are filled using the mean.

Missing categorical values are filled using the most frequent value.

Categorical data is encoded using Label Encoding and One-Hot
Encoding.

Data is split into training and testing sets using test_size=0.2
and random_state=42.

Features are standardized with StandardScaler.

A GaussianNB classifier is trained.

Model accuracy is evaluated on the test set.

The ML probability is combined with a rule-based score to produce
the final eligibility result.

Tech Stack

Frontend

HTML5

CSS

JavaScript

Bootstrap 5

Font Awesome

AOS animations

Chart.js

Backend

Python

Flask

Flask-CORS

Pandas

NumPy

Scikit-learn

Data / Utilities

CSV loan dataset

Requests

BeautifulSoup

lxml

JSON caching

Pickle model persistence

Project Structure

LoanSphere/
├── index.html
├── app.py
├── bank_rates.py
├── loan_approval_data.csv
├── requirements.txt
├── css/
│   └── style.css
├── js/
│   └── script.js
├── model/
│   ├── model.pkl
│   ├── scaler.pkl
│   └── features.pkl
└── cache/
    └── bank_rates.json

Installation

Clone or download the project and open a terminal in the project
directory.

1. Create a virtual environment

python -m venv venv

2. Activate it

Windows:

venv\Scripts\activate

macOS/Linux:

source venv/bin/activate

3. Install dependencies

pip install -r requirements.txt

Run the Application

Start the Flask backend:

python app.py

The backend runs on:

http://localhost:5000

Then open index.html in the browser or serve the frontend through a
local web server.

API Endpoints

Health Check

GET /api/health

Returns backend/model status and the stored model accuracy.

Loan Prediction

POST /api/predict
Content-Type: application/json

The request accepts applicant information such as monthly income, age,
credit score, employment type, existing loans, loan amount, loan
duration, education level, marital status, loan purpose, property area,
and gender.

The response includes:

category

approval_pct

risk_level

suggested_amount

suggested_rate

message

Bank Rates

GET /api/banks

Returns available bank interest-rate information. The backend attempts
to retrieve current data, caches the result for one hour, and uses
fallback data if scraping is unavailable.

Model

The machine-learning component uses Gaussian Naive Bayes
(GaussianNB). The final eligibility score is a hybrid of:

ML probability

Income

Credit score

Existing loans

Debt-to-income ratio

Age

Employment type

The system adaptively reduces the ML contribution when selected inputs
are significantly outside the training-data range.

Requirements

The project requires Python packages including Flask, Flask-CORS,
Pandas, NumPy, Scikit-learn, Requests, BeautifulSoup4, and lxml.

Disclaimer

LoanSphere is an educational/project application demonstrating
AI/ML-based loan assessment. Its predictions and suggested rates are not
a substitute for an official lending decision from a bank or financial
institution.
