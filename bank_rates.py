import requests, json, os, time
from bs4 import BeautifulSoup

CACHE_FILE = os.path.join(os.path.dirname(__file__), "cache", "bank_rates.json")

BANK_NAME_MAP = {
    "state bank of india": "SBI",
    "sbi": "SBI",
    "hdfc bank": "HDFC",
    "hdfc": "HDFC",
    "icici bank": "ICICI",
    "icici": "ICICI",
    "axis bank": "Axis Bank",
    "axis": "Axis Bank",
    "kotak mahindra bank": "Kotak Mahindra",
    "kotak mahindra": "Kotak Mahindra",
    "kotak": "Kotak Mahindra",
    "pnb": "PNB",
    "punjab national bank": "PNB",
}

FALLBACK_RATES = {
    "SBI": {"rate": "10.00% - 15.00%", "fee": "Up to 1.50%", "type": "public", "color": "#1a5276", "maxLoan": "\u20b91 Cr", "tenure": "30 Years"},
    "HDFC": {"rate": "9.99% - 24.00%", "fee": "\u20b96,500 + GST", "type": "private", "color": "#004c8c", "maxLoan": "\u20b92 Cr", "tenure": "30 Years"},
    "ICICI": {"rate": "9.99% - 16.50%", "fee": "Up to 2%", "type": "private", "color": "#f58220", "maxLoan": "\u20b91.5 Cr", "tenure": "30 Years"},
    "Axis Bank": {"rate": "8.75% - 21.55%", "fee": "Up to 2%", "type": "private", "color": "#97144d", "maxLoan": "\u20b91.5 Cr", "tenure": "30 Years"},
    "PNB": {"rate": "10.25% onwards", "fee": "0.35%", "type": "public", "color": "#0f4d8a", "maxLoan": "\u20b975 L", "tenure": "30 Years"},
    "Kotak Mahindra": {"rate": "10.99% onwards", "fee": "Up to 5%", "type": "private", "color": "#d4145a", "maxLoan": "\u20b92 Cr", "tenure": "30 Years"},
}

def parse_rate(rate_str):
    """Parse rate string like '10.00% p.a. to 15.00% p.a.' -> '10.00% - 15.00%'"""
    if not rate_str:
        return "N/A"
    rate_str = rate_str.replace("p.a.", "").replace("onwards", "").strip()
    # Handle "Floating: Starting from 10.25% p.a.Fixed: Starting from 11.25% p.a."
    if "Floating:" in rate_str:
        import re
        matches = re.findall(r'[\d.]+%', rate_str)
        if matches:
            return matches[0]
    if "to" in rate_str:
        parts = rate_str.split("to")
        parts = [p.strip().rstrip("%") for p in parts]
        return f"{parts[0]}% - {parts[1]}%"
    if rate_str.endswith("%"):
        return rate_str
    # Just a number with %
    import re
    match = re.search(r'[\d.]+%', rate_str)
    return match.group(0) if match else rate_str

def parse_fee(fee_str):
    """Clean up processing fee string."""
    if not fee_str:
        return "N/A"
    return fee_str.replace("p.a.", "").strip()

def scrape_bank_rates():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    r = requests.get(
        'https://www.bankbazaar.com/personal-loan-interest-rate.html',
        headers=headers, timeout=15
    )
    soup = BeautifulSoup(r.text, 'lxml')
    tables = soup.find_all('table')

    scraped = {}
    for t in tables:
        rows = t.find_all('tr')
        header_cells = rows[0].find_all(['th', 'td'])
        headers_text = [c.get_text(strip=True) for c in header_cells]
        if 'Bank Name' not in headers_text:
            continue
        for row in rows[1:]:
            cells = row.find_all(['th', 'td'])
            vals = [c.get_text(strip=True) for c in cells]
            if len(vals) < 2:
                continue
            bank_name = vals[0].strip()
            rate_raw = vals[1] if len(vals) > 1 else ""
            fee_raw = vals[2] if len(vals) > 2 else ""
            # Try to match to our banks
            key = None
            for search, mapped in BANK_NAME_MAP.items():
                if search in bank_name.lower():
                    key = mapped
                    break
            if key:
                scraped[key] = {
                    "rate": parse_rate(rate_raw),
                    "fee": parse_fee(fee_raw),
                }
    return scraped

def get_bank_rates():
    # Check cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                cache = json.load(f)
            age = time.time() - cache.get("timestamp", 0)
            if age < 3600:  # 1 hour cache
                return cache["data"], cache["timestamp"]
        except Exception:
            pass

    # Scrape fresh
    scraped = {}
    try:
        scraped = scrape_bank_rates()
    except Exception as e:
        print(f"[BankRates] Scrape failed: {e}")

    # Merge with fallback data
    result = []
    for name, fb in FALLBACK_RATES.items():
        entry = dict(fb)
        if name in scraped:
            entry["rate"] = scraped[name]["rate"]
            entry["fee"] = scraped[name]["fee"]
            entry["source"] = "live"
        else:
            entry["source"] = "static"
        entry["name"] = name
        entry["icon"] = "fa-building-columns"
        result.append(entry)

    # Cache
    ts = time.time()
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump({"timestamp": ts, "data": result}, f)

    return result, ts

if __name__ == "__main__":
    data, ts = get_bank_rates()
    print(f"Last updated: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(ts))}")
    for b in data:
        src = "LIVE" if b["source"] == "live" else "STATIC"
        print(f"  [{src}] {b['name']}: {b['rate']} | Fee: {b['fee']}")
