#!/bin/bash
# Block npm usage script
# Place this as npm in your PATH (with higher priority than real npm)

echo "🚫 NPM usage blocked in this project!"
echo "📦 Please use Yarn instead:"
echo ""

# Convert npm commands to yarn equivalents
case "$1" in
  "install"|"i")
    echo "   Use: yarn install"
    ;;
  "run")
    echo "   Use: yarn $2"
    ;;
  "add")
    echo "   Use: yarn add $2"
    ;;
  "remove"|"uninstall")
    echo "   Use: yarn remove $2"
    ;;
  "start")
    echo "   Use: yarn start"
    ;;
  "test")
    echo "   Use: yarn test"
    ;;
  "audit")
    echo "   Use: yarn audit"
    ;;
  *)
    echo "   Convert 'npm $*' to equivalent yarn command"
    ;;
esac

echo ""
echo "📚 See YARN_GUIDE.md for complete migration guide"
exit 1