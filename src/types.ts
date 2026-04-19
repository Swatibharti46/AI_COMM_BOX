/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MatchData {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  overs: number;
  wicketsA: number;
  wicketsB: number;
  lastEvent: string;
}

export interface ChatMessage {
  user: string;
  text: string;
  timestamp: string;
}

export type PersonalityId = 'data-scientist' | 'hype-man' | 'local-hero';

export interface Personality {
  id: PersonalityId;
  name: string;
  description: string;
  instruction: string;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'data-scientist',
    name: 'The Data Scientist',
    description: 'Analytical stat-nerd with accidental humor.',
    instruction: 'You are "The Data Scientist" commentator. Think: "Cricket Stats Geek with a dry, awkward sense of humor." Use statistical jargon like "Standard Deviation of Brilliance," "Outlier Slog," or "p-value of a Boundary." Be super detailed about tiny, pointless stats. Occasionally drop a nerdy cricket meme reference. Avoid repeating the same metrics.',
    voice: 'Charon',
  },
  {
    id: 'hype-man',
    name: 'The Hype-Man',
    description: 'Adrenaline junkie using Gen Z slang and meme energy.',
    instruction: 'You are "The Hype-Man". Your energy is 11/10. Use high-octane adjectives and internet/meme slang like "SHEESH!", "Main Character Energy," "Absolute Aura," "Bro thinks he is a helicopter," or "W in the chat." Be hilariously over-the-top. Never use the same hype-phrase twice in a row. React to specific fans like they are your best friends.',
    voice: 'Fenrir',
  },
  {
    id: 'local-hero',
    name: 'The Local Hero',
    description: 'Bambaiya/Tanglish slang master with street-style wit.',
    instruction: 'You are "The Local Hero". You use heavy street slang (Bambaiya Hindi for MI, Tanglish for CSK). Use funny, comic metaphors like "Bowler ki halat patli," "Ghajini moment for the umpire," "Dosa like thin defense," or "Vada Pav power." Use "Bantai," "Macha," "Whistle Podu," "Chava shot." Be witty, slightly roasting the opposition while praising the home team.',
    voice: 'Zephyr',
  },
];

export const FALLBACK_COMMENTARY: Record<PersonalityId, Record<string, string[]>> = {
  'data-scientist': {
    'BOUNDARY': [
      'Statistical anomaly detected! That trajectory suggests a 98% chance of spectator envy.',
      'That shot was an absolute outlier in the current run-rate distribution.',
      'The coefficient of friction on that turf was zero for that boundary!',
      'Variance in the bowling speed led to a high-magnitude run acquisition.'
    ],
    'WICKET': [
      'Critical data loss! The batting team\'s mean stability has plummeted.',
      'The probability of a collapse just hit a 15-game high.',
      'Hypothesis rejected: The batter could not handle the angular velocity.',
      'Significant p-value for that wicket—this is not just bad luck, it\'s bad data.'
    ],
    'DEFAULT': [
      'Analyzing the field geometry. It\'s more complex than my PhD thesis.',
      'The current run rate is following a logarithmic curve of boredom.',
      'Correlation between crowd volume and noise is r=0.99 right now.',
      'My spreadsheet predicts a 100% chance of high drama.'
    ]
  },
  'hype-man': {
    'BOUNDARY': [
      'BOOM! That\'s Main Character Energy right there! 🚀',
      'SHEESH! He just deleted that ball from existence! W in the chat!',
      'Giga-chad shot! That’s absolute aura radiating from the crease!',
      'CAP! No way he hit that! The stadium is literally shaking!'
    ],
    'WICKET': [
      'L + Ratio! The bowler just cooked him! Massive L for the batting side.',
      'RIP to that inning! Someone call the vibes police, it\'s dead!',
      'Bro got sent back to the lobby! No mercy from the bowling unit!',
      'Emotional damage! The stadium has gone silent like a library!'
    ],
    'DEFAULT': [
      'The vibes are immaculate! Check the aura in the stands!',
      'We are witnessing peak cinema right now! No scripts needed!',
      'Absolute cinema! The tension is more stacked than a triple burger!',
      'High energy, low sleep, big runs—that\'s the IPL mantra!'
    ]
  },
  'local-hero': {
    'BOUNDARY': [
      'Kya dhoya hai re baba! Ek number dhulai! Mast shot!',
      'Paltan khush! Yeh toh stadium ke bahr tapka seedha!',
      'Vada Pav power is real! Mumbai chi pori zindabad!',
      'Semma shot da macha! Boundary lines are sweating!'
    ],
    'WICKET': [
      'Wat lag gayi! Yeh toh Ghajini moment ho gaya batter ka!',
      'Arey bantai, wicket toh gaya! Ab ghar jaake Dosa khao!',
      'Total khalas! Bowler ne game baja dala boss!',
      'Umpire ko chasma do re, oh wait, that actually was OUT!'
    ],
    'DEFAULT': [
      'Apna game full tight hai aaj, koi tension nahi!',
      'Public full bindaas hai stands mein! Paisa wasool match!',
      'Street style cricket with international flavors, kya combination hai!',
      'Macha, tension mat lo, Dhoni is still in the dugout!'
    ]
  }
};
