const fs = require('fs');

// Fix server.ts
let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.replace(/\\\$\{/g, '${');
fs.writeFileSync('server.ts', serverTs);

// Fix Editor.tsx
let editorTsx = fs.readFileSync('src/pages/Editor.tsx', 'utf8');
editorTsx = editorTsx.replace(/\\\$\{/g, '${');
editorTsx = editorTsx.replace(
`    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress('');
  };`, 
`    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress('');
    }
  };`
);
fs.writeFileSync('src/pages/Editor.tsx', editorTsx);

console.log("Fixes applied successfully.");
