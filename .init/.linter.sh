#!/bin/bash
cd /home/kavia/workspace/code-generation/wego-travel-planner-41171-41181/wego_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

