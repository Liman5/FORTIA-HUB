const fs = require("fs");
const f = "components/pages/MemberPage.tsx";
const lines = fs.readFileSync(f, "utf8").split("\n");

const newLines = [];
let i = 0;
while (i < lines.length) {
  // Si pattern : "      />" + "onLogout" + "initialTab" + "      />" (fin du bloc)
  if (i + 3 < lines.length &&
      lines[i].trim() === "/>" &&
      lines[i+1].includes("onLogout={logoutUser}") &&
      lines[i+2].includes("initialTab={initialTab") &&
      lines[i+3].trim() === "/>") {
    // On garde la première fermeture (ligne i), on saute les 3 lignes du doublon
    newLines.push(lines[i]);
    i += 4; // saute le doublon complet
    continue;
  }
  newLines.push(lines[i]);
  i++;
}

fs.writeFileSync(f, newLines.join("\n"), "utf8");
console.log("OK - Doublons supprimes");