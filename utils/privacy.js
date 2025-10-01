exports.generatePrivacyNotice = (length = 'short') => {
  if (length === 'short') {
    return 'We store only your Discord ID and Riot PUUID (anonymous). No tokens or passwords.';
  }
  return `
**Privacy Notice**  
- Stored: Discord ID, Riot PUUID, tagline, link time  
- Not stored: Passwords, access tokens, message history  
- Data used only to fetch public match data from Riot  
- Delete anytime with future \`/unlink\` command  
- Not affiliated with Riot Games
  `.trim();
};