import os
import sys

# Reconfigure stdout/stderr to use UTF-8 encoding (prevents UnicodeEncodeError on Windows)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def verify_deployment():
    print("=" * 60)
    print("🔍 COMPLIANCEAI ENVIRONMENT VALIDATOR")
    print("=" * 60)

    # 1. Check for .env file
    if not os.path.exists(".env"):
        print("❌ Error: '.env' file not found.")
        print("   Please copy '.env.example' to '.env' and fill in the values.")
        return False
    print("✅ Found '.env' configuration file.")

    # 2. Check for required folders
    policies_dir = "data/policies"
    if not os.path.exists(policies_dir):
        print(f"⚠️  Warning: '{policies_dir}' directory does not exist. Creating it now...")
        os.makedirs(policies_dir, exist_ok=True)
    print(f"✅ Policies folder exists at: {policies_dir}")

    # 3. Read .env file to validate variables
    env_vars = {}
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip()

    required_vars = ["GEMINI_API_KEY", "JWT_SECRET_KEY", "ADMIN_PASSWORD", "EMPLOYEE_PASSWORD", "FRONTEND_URL"]
    missing_vars = [
        var for var in required_vars 
        if not env_vars.get(var) 
        or "your_" in env_vars.get(var) 
        or "generate_" in env_vars.get(var) 
        or "change_this_" in env_vars.get(var)
    ]

    if missing_vars:
        print(f"❌ Error: The following environment variables are missing or placeholders in your '.env' file:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    print("✅ All required environment variables are set and configured.")

    # 4. Check for policy PDF documents
    pdfs = [f for f in os.listdir(policies_dir) if f.lower().endswith(".pdf")]
    if not pdfs:
        print(f"⚠️  Warning: No PDF documents found in '{policies_dir}'.")
        print("   Please place your company policy PDF files inside the folder so they can be indexed.")
    else:
        print(f"✅ Found {len(pdfs)} policy PDF(s) to index:")
        for pdf in pdfs:
            print(f"   - {pdf}")

    print("\n🎉 Verification Succeeded! Your project is ready for deployment.")
    return True

if __name__ == "__main__":
    success = verify_deployment()
    sys.exit(0 if success else 1)
