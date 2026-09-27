import re

# 1. Clean up login.html
with open('/home/SardorDev2010/Desktop/markcrm/frontend/login.html', 'r') as f:
    login_html = f.read()

# Remove the switch-btns div
login_html = re.sub(r'<div class="d-flex switch-btns mb-4">.*?</div>', '', login_html, flags=re.DOTALL)
with open('/home/SardorDev2010/Desktop/markcrm/frontend/login.html', 'w') as f:
    f.write(login_html)

# 2. Clean up auth-ui.js
with open('/home/SardorDev2010/Desktop/markcrm/frontend/js/auth-ui.js', 'r') as f:
    js = f.read()

# Remove email tab logic
js = re.sub(r'var emailTabEl = \$\("emailTab"\);.*?var labelEl = \$\("loginLabel"\);', 'var labelEl = $("loginLabel");', js, flags=re.DOTALL)
js = re.sub(r'if \(emailTabEl && phoneTabEl && labelEl\) \{.*?\}\n', '', js, flags=re.DOTALL)
# Remove the loginType validation
js = re.sub(r'if \(loginType === "email"\) \{.*?\}\n\s*else \{', '', js, flags=re.DOTALL)
js = js.replace('        // user login\n', '')
# Ensure brackets match. Actually, it's safer to just replace specific lines.
