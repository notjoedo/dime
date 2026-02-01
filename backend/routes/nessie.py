"""
Nessie API Routes
- Capital One Nessie API integration for account and income data
- Sandbox API: http://api.nessieisreal.com
"""

import os
import requests
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta

nessie_bp = Blueprint('nessie', __name__, url_prefix='/api/nessie')

NESSIE_BASE_URL = "http://api.nessieisreal.com"
NESSIE_API_KEY = os.getenv("NESSIE_API_KEY", "")


def get_api_key():
    """Get Nessie API key from environment"""
    return NESSIE_API_KEY


@nessie_bp.route("/accounts", methods=["GET"])
def get_accounts():
    """Get all accounts from Nessie API"""
    api_key = get_api_key()
    if not api_key or api_key == "your_nessie_api_key_here":
        return jsonify({"error": "Nessie API key not configured", "accounts": []}), 200

    try:
        response = requests.get(
            f"{NESSIE_BASE_URL}/accounts",
            params={"key": api_key}
        )

        if response.status_code == 200:
            accounts = response.json()
            return jsonify({"accounts": accounts})
        else:
            return jsonify({"error": f"Nessie API error: {response.status_code}", "accounts": []}), 200
    except Exception as e:
        return jsonify({"error": str(e), "accounts": []}), 200


@nessie_bp.route("/customers", methods=["GET"])
def get_customers():
    """Get all customers from Nessie API"""
    api_key = get_api_key()
    if not api_key or api_key == "your_nessie_api_key_here":
        return jsonify({"error": "Nessie API key not configured", "customers": []}), 200

    try:
        response = requests.get(
            f"{NESSIE_BASE_URL}/customers",
            params={"key": api_key}
        )

        if response.status_code == 200:
            customers = response.json()
            return jsonify({"customers": customers})
        else:
            return jsonify({"error": f"Nessie API error: {response.status_code}", "customers": []}), 200
    except Exception as e:
        return jsonify({"error": str(e), "customers": []}), 200


@nessie_bp.route("/accounts/<account_id>/deposits", methods=["GET"])
def get_deposits(account_id):
    """Get deposits (income) for an account"""
    api_key = get_api_key()
    if not api_key or api_key == "your_nessie_api_key_here":
        return jsonify({"error": "Nessie API key not configured", "deposits": []}), 200

    try:
        response = requests.get(
            f"{NESSIE_BASE_URL}/accounts/{account_id}/deposits",
            params={"key": api_key}
        )

        if response.status_code == 200:
            deposits = response.json()
            return jsonify({"deposits": deposits})
        else:
            return jsonify({"error": f"Nessie API error: {response.status_code}", "deposits": []}), 200
    except Exception as e:
        return jsonify({"error": str(e), "deposits": []}), 200


@nessie_bp.route("/accounts/<account_id>/purchases", methods=["GET"])
def get_purchases(account_id):
    """Get purchases (spending) for an account"""
    api_key = get_api_key()
    if not api_key or api_key == "your_nessie_api_key_here":
        return jsonify({"error": "Nessie API key not configured", "purchases": []}), 200

    try:
        response = requests.get(
            f"{NESSIE_BASE_URL}/accounts/{account_id}/purchases",
            params={"key": api_key}
        )

        if response.status_code == 200:
            purchases = response.json()
            return jsonify({"purchases": purchases})
        else:
            return jsonify({"error": f"Nessie API error: {response.status_code}", "purchases": []}), 200
    except Exception as e:
        return jsonify({"error": str(e), "purchases": []}), 200


@nessie_bp.route("/income-trends", methods=["GET", "POST"])
def get_income_trends():
    """
    Get income trends from Nessie API deposits.
    Aggregates deposits by month to show income over time.
    """
    api_key = get_api_key()
    if not api_key or api_key == "your_nessie_api_key_here":
        # Return sample data for demo purposes when API key not configured
        return jsonify({
            "source": "sample",
            "message": "Using sample data. Configure NESSIE_API_KEY for live data.",
            "trends": _get_sample_income_trends()
        })

    data = request.json if request.method == "POST" else {}
    account_id = data.get("account_id") or request.args.get("account_id")
    months = int(data.get("months", request.args.get("months", 6)))

    try:
        # If no account_id provided, get all accounts and aggregate
        if not account_id:
            accounts_response = requests.get(
                f"{NESSIE_BASE_URL}/accounts",
                params={"key": api_key}
            )

            if accounts_response.status_code != 200:
                return jsonify({
                    "source": "sample",
                    "message": "Could not fetch accounts. Using sample data.",
                    "trends": _get_sample_income_trends()
                })

            accounts = accounts_response.json()

            # If no accounts exist, fall back to sample data
            if not accounts:
                return jsonify({
                    "source": "sample",
                    "message": "No accounts found in Nessie. Using sample data. Call /api/nessie/create-demo-data to create test data.",
                    "trends": _get_sample_income_trends()
                })

            all_deposits = []

            for account in accounts:
                deposits_response = requests.get(
                    f"{NESSIE_BASE_URL}/accounts/{account['_id']}/deposits",
                    params={"key": api_key}
                )
                if deposits_response.status_code == 200:
                    deposits = deposits_response.json()
                    all_deposits.extend(deposits)

            # If no deposits found, fall back to sample data
            if not all_deposits:
                return jsonify({
                    "source": "sample",
                    "message": "No deposits found in Nessie accounts. Using sample data.",
                    "trends": _get_sample_income_trends()
                })
        else:
            deposits_response = requests.get(
                f"{NESSIE_BASE_URL}/accounts/{account_id}/deposits",
                params={"key": api_key}
            )

            if deposits_response.status_code != 200:
                return jsonify({
                    "source": "sample",
                    "message": "Could not fetch deposits. Using sample data.",
                    "trends": _get_sample_income_trends()
                })

            all_deposits = deposits_response.json()

        # Aggregate deposits by month
        trends = _aggregate_deposits_by_month(all_deposits, months)

        # If no meaningful data (all zeros), fall back to sample data
        total_income = sum(t.get("amount", 0) for t in trends)
        if total_income == 0:
            return jsonify({
                "source": "sample",
                "message": "No income data in the selected period. Using sample data.",
                "trends": _get_sample_income_trends()
            })

        return jsonify({
            "source": "nessie",
            "account_id": account_id,
            "months": months,
            "trends": trends
        })

    except Exception as e:
        return jsonify({
            "source": "sample",
            "error": str(e),
            "message": "Error fetching from Nessie. Using sample data.",
            "trends": _get_sample_income_trends()
        })


def _aggregate_deposits_by_month(deposits, months=6):
    """Aggregate deposits by month"""
    monthly_totals = {}

    # Initialize months
    today = datetime.now()
    for i in range(months):
        month_date = today - timedelta(days=30 * i)
        month_key = month_date.strftime("%Y-%m")
        month_label = month_date.strftime("%b")
        monthly_totals[month_key] = {"month": month_label, "amount": 0}

    # Sum deposits by month
    for deposit in deposits:
        if isinstance(deposit, dict):
            trans_date = deposit.get("transaction_date", "")
            amount = deposit.get("amount", 0)

            if trans_date:
                try:
                    # Parse date (Nessie format: YYYY-MM-DD)
                    date_obj = datetime.strptime(trans_date[:10], "%Y-%m-%d")
                    month_key = date_obj.strftime("%Y-%m")

                    if month_key in monthly_totals:
                        monthly_totals[month_key]["amount"] += float(amount)
                except (ValueError, TypeError):
                    pass

    # Convert to sorted list (oldest first)
    sorted_months = sorted(monthly_totals.keys())
    return [monthly_totals[m] for m in sorted_months]


def _get_sample_income_trends():
    """Return sample income data for demo purposes"""
    today = datetime.now()
    sample_data = []

    # Generate 6 months of sample income data
    base_income = 4500
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=30 * i)
        month_label = month_date.strftime("%b")

        # Add some variation to make it look realistic
        variation = (hash(month_label) % 1000) - 500
        amount = base_income + variation

        sample_data.append({
            "month": month_label,
            "amount": round(amount, 2)
        })

    return sample_data


@nessie_bp.route("/create-demo-data", methods=["POST"])
def create_demo_data():
    """
    Create demo customer, accounts, and transactions in Nessie sandbox.
    Useful for setting up test data.
    """
    api_key = get_api_key()
    if not api_key or api_key == "your_nessie_api_key_here":
        return jsonify({"error": "Nessie API key not configured"}), 400

    try:
        # Create a demo customer
        customer_data = {
            "first_name": "Demo",
            "last_name": "User",
            "address": {
                "street_number": "123",
                "street_name": "Main St",
                "city": "Blacksburg",
                "state": "VA",
                "zip": "24060"
            }
        }

        customer_response = requests.post(
            f"{NESSIE_BASE_URL}/customers",
            params={"key": api_key},
            json=customer_data
        )

        if customer_response.status_code != 201:
            return jsonify({
                "error": "Failed to create customer",
                "details": customer_response.text
            }), 400

        customer = customer_response.json()
        customer_id = customer.get("objectCreated", {}).get("_id")

        # Create a checking account
        account_data = {
            "type": "Checking",
            "nickname": "Demo Checking",
            "rewards": 0,
            "balance": 5000
        }

        account_response = requests.post(
            f"{NESSIE_BASE_URL}/customers/{customer_id}/accounts",
            params={"key": api_key},
            json=account_data
        )

        if account_response.status_code != 201:
            return jsonify({
                "error": "Failed to create account",
                "customer_id": customer_id,
                "details": account_response.text
            }), 400

        account = account_response.json()
        account_id = account.get("objectCreated", {}).get("_id")

        # Create sample deposits (income)
        deposits_created = 0
        today = datetime.now()

        for i in range(6):
            deposit_date = (today - timedelta(days=30 * i)).strftime("%Y-%m-%d")
            deposit_data = {
                "medium": "balance",
                "transaction_date": deposit_date,
                "status": "completed",
                "amount": 4500 + (i * 100),
                "description": f"Payroll Deposit - Month {6-i}"
            }

            deposit_response = requests.post(
                f"{NESSIE_BASE_URL}/accounts/{account_id}/deposits",
                params={"key": api_key},
                json=deposit_data
            )

            if deposit_response.status_code == 201:
                deposits_created += 1

        return jsonify({
            "success": True,
            "customer_id": customer_id,
            "account_id": account_id,
            "deposits_created": deposits_created,
            "message": "Demo data created successfully. Use account_id for income trends."
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
