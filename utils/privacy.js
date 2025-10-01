exports.generatePrivacyNotice = (length = 'short') => {
  if (length === 'short') {
    return 'We store only your Discord ID and Riot PUUID (anonymous ID). No tokens or passwords.';
  }
  return `
**Privacy Notice**  
- Stored: Discord ID, Riot PUUID, link timestamp  
- Not stored: Username, password, access tokens  
- Data is used only to fetch public match history from Riot  
- Delete anytime with \`/unlink\`  
- Not affiliated with Riot Games
  `.trim();
};