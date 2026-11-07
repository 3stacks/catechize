// The Bible verses that Christians memorise most, each with a short note on
// what it says. The verse pages add the KJV text, the verses around it, and
// the catechism questions that cite it.

export interface VersePage {
  /** Passage id, as in the app: "John.3.16" or "Prov.3.5-6". */
  id: string
  note: string
}

export const VERSES: VersePage[] = [
  { id: 'John.3.16', note: 'Jesus tells Nicodemus why the Son came: God gave his Son because he loved the world. Whoever believes in him has everlasting life. Many people call it the gospel in one verse.' },
  { id: 'Rom.8.28', note: 'Paul comforts believers in their suffering. God works all things together for the good of those who love him, because he called them according to his purpose.' },
  { id: 'Phil.4.13', note: 'Paul writes from prison. He learned to be content with much or with little, because Christ gives him strength for each condition.' },
  { id: 'Jer.29.11', note: 'God speaks to the Jews in exile in Babylon. After seventy years, he will bring them home. His thoughts towards them are thoughts of peace.' },
  { id: 'Prov.3.5-6', note: 'Solomon tells his son to trust the Lord with all his heart and not his own understanding. The Lord then directs his paths.' },
  { id: 'Ps.23.1-6', note: 'David calls the Lord his shepherd. The Lord feeds, leads, restores and protects him, even in the valley of the shadow of death.' },
  { id: 'Isa.41.10', note: 'God tells Israel not to fear, because he is their God. He will strengthen them, help them and hold them up.' },
  { id: 'Josh.1.9', note: 'After the death of Moses, God commands Joshua to be strong and of good courage. The Lord will be with him wherever he goes.' },
  { id: 'Rom.12.1-2', note: 'Paul asks believers, because of God’s mercies, to give their bodies as a living sacrifice. They must not conform to this world, but be transformed by a renewed mind.' },
  { id: 'Phil.4.6-7', note: 'Paul tells believers to bring every need to God in prayer with thanksgiving. The peace of God then keeps their hearts and minds through Christ Jesus.' },
  { id: 'Matt.28.19-20', note: 'The risen Christ sends his disciples to teach all nations, to baptise them in the name of the Trinity, and to teach them to obey. He promises to be with them always.' },
  { id: '2Tim.3.16-17', note: 'Paul says that all Scripture is given by inspiration of God. It makes the man of God complete for every good work.' },
  { id: 'Rom.3.23', note: 'Paul concludes that all people, Jews and Gentiles, are sinners. All come short of the glory of God.' },
  { id: 'Rom.6.23', note: 'Sin pays its wages, which is death. But eternal life is a gift of God through Jesus Christ.' },
  { id: 'Eph.2.8-9', note: 'Paul says that we are saved by grace through faith. Salvation is the gift of God, not the result of works, so no one can boast.' },
  { id: 'Gal.2.20', note: 'Paul says that he is crucified with Christ. Now Christ lives in him, and he lives by faith in the Son of God, who loved him and gave himself for him.' },
  { id: '2Cor.5.17', note: 'Anyone who is in Christ is a new creature. The old things are passed away, and all things are become new.' },
  { id: 'Matt.6.33', note: 'In the Sermon on the Mount, Jesus tells his disciples not to worry about food and clothing. They must seek first the kingdom of God.' },
  { id: '1John.1.9', note: 'John promises that God forgives the sins that we confess. God is faithful and just, and he cleanses us from all unrighteousness.' },
  { id: 'Ps.119.11', note: 'The psalmist hides God’s word in his heart so that he does not sin. This is the classic verse on memorising Scripture.' },
  { id: 'Heb.11.1', note: 'This verse begins the great chapter on faith. Faith is the substance of things hoped for, and the evidence of things not seen.' },
  { id: 'Rom.10.9', note: 'Paul says that a person who confesses Jesus as Lord and believes that God raised him from the dead will be saved.' },
  { id: 'John.14.6', note: 'On the night before his death, Jesus tells his disciples that he is the way, the truth and the life. No one comes to the Father except through him.' },
  { id: 'Isa.40.31', note: 'God gives power to the weak. Those who wait upon the Lord renew their strength. They mount up with wings as eagles.' },
  { id: '1Cor.10.13', note: 'Paul tells the Corinthians that God is faithful. He does not let his people be tempted beyond their strength, and he makes a way to escape.' },
  { id: 'Matt.11.28-30', note: 'Jesus invites all who labour and are heavy laden to come to him. He gives rest, and his yoke is easy.' },
  { id: 'Ps.46.10', note: 'In a psalm about God as a refuge in trouble, God tells the nations to be still and know that he is God.' },
  { id: 'Rom.5.8', note: 'God shows his love for us in this: while we were still sinners, Christ died for us.' },
  { id: 'John.1.1', note: 'John begins his gospel with the eternal Word. The Word was with God, and the Word was God. Verse 14 says that the Word became flesh.' },
  { id: 'Gen.1.1', note: 'The first verse of the Bible. God created the heavens and the earth.' },
  { id: '1Pet.5.7', note: 'Peter tells believers to cast all their care upon God, because God cares for them.' },
  { id: 'Lam.3.22-23', note: 'Jeremiah mourns the fall of Jerusalem. In his grief, he remembers that the Lord’s compassions do not fail. They are new every morning.' },
  { id: 'Mic.6.8', note: 'The prophet tells Israel what the Lord requires: to do justly, to love mercy, and to walk humbly with God.' },
  { id: 'Matt.22.37-39', note: 'Jesus gives the two great commandments: love God with all your heart, soul and mind, and love your neighbour as yourself. They summarise the Ten Commandments.' },
  { id: 'Isa.53.5', note: 'Isaiah tells of the suffering servant. He was wounded for our transgressions, and with his stripes we are healed.' },
  { id: 'John.11.25', note: 'At the grave of Lazarus, Jesus tells Martha that he is the resurrection and the life. Whoever believes in him will live.' },
  { id: 'Rom.1.16', note: 'Paul is not ashamed of the gospel, because it is the power of God to salvation for everyone who believes.' },
  { id: '1Cor.13.4-7', note: 'Paul describes love. Love is patient and kind. It does not envy, boast or seek its own. It bears, believes, hopes and endures all things.' },
  { id: 'Deut.6.4-7', note: 'Moses gives the Shema: the Lord our God is one Lord. Israel must love him with all their heart, and teach his words to their children.' },
  { id: 'Heb.4.12', note: 'The word of God has life and power. It is sharper than any two-edged sword, and it judges the thoughts of the heart.' },
  { id: 'Ps.27.1', note: 'David says that the Lord is his light and his salvation. So he fears no one.' },
  { id: 'Prov.22.6', note: 'Solomon tells parents to train a child in "the way he should go". When he is old, he will not depart from it.' },
  { id: 'John.15.5', note: 'Jesus is the vine, and his disciples are the branches. Without him, they can do nothing.' },
  { id: 'Col.3.23', note: 'Paul tells believers to do all their work heartily, as to the Lord and not to men.' },
  { id: '2Cor.12.9', note: 'The Lord tells Paul that his grace is enough for him. His strength is made perfect in weakness.' },
  { id: 'Ps.1.1-2', note: 'The first psalm calls the man blessed who does not walk in the counsel of the ungodly. He delights in the law of the Lord and meditates on it day and night.' },
]
