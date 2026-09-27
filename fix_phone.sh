for file in lib/screens/auth/register_screen.dart lib/screens/auth/forgot_password_screen.dart; do
  sed -i 's/_phoneCtrl.text.trim()/phoneStr/g' "$file"
done
