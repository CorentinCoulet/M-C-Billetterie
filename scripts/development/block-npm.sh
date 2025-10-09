#!/bin/bash
# Enforce Yarn usage script
# This script has been updated as npm is no longer used in this project

echo "✅ This project uses YARN exclusively!"
echo "📦 All package management is done through Yarn:"
echo ""

# Show yarn equivalents for any attempted command
if [ $# -gt 0 ]; then
  case "$1" in
    "install"|"i")
      echo "   Command: yarn install"
      ;;
    "run")
      echo "   Command: yarn $2"
      ;;
    "add")
      echo "   Command: yarn add $2"
      ;;
    "remove"|"uninstall")
      echo "   Command: yarn remove $2"
      ;;
    "start")
      echo "   Command: yarn start"
      ;;
    "test")
      echo "   Command: yarn test"
      ;;
    "audit")
      echo "   Command: yarn audit"
      ;;
    *)
      echo "   Use Yarn commands instead"
      ;;
  esac
  echo ""
fi

echo "📚 This project is fully configured for Yarn"
echo "🔧 Package manager: yarn@1.22.22"
exit 0