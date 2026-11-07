// The text of the content pages for each creed, catechism and confession.
// Each page explains the document and links to it in the app.

export type Section = 'creeds' | 'reformed' | 'lutheran' | 'scripture'

export interface DocPage {
  docId: string
  section: Section
  slug: string
  /** The name in a sentence: "the Nicene Creed". */
  name: string
  /** Short name for buttons: "the Nicene Creed". Defaults to name. */
  short?: string
  /** The <title>. Keep it under 60 characters. */
  title: string
  /** The meta description. Keep it under 160 characters. */
  description: string
  lede: string
  facts: [string, string][]
  about: string[]
  history: string[]
  /** What the document teaches, part by part. */
  outline: [string, string][]
  faq: [string, string][]
  /** Show only the first groups of a very long text on the page. */
  groupsShown?: number
}

export const SECTIONS: Record<Section, { title: string; heading: string; description: string; intro: string }> = {
  creeds: {
    title: 'The ecumenical creeds',
    heading: 'The creeds',
    description: 'The Apostles’, Nicene and Athanasian Creeds and the Definition of Chalcedon: text, history and meaning. Learn each one by heart, free.',
    intro: 'Christians in every tradition confess these creeds. They state the faith of the early church about the Trinity and about the person of Christ.',
  },
  reformed: {
    title: 'Reformed catechisms and confessions',
    heading: 'Reformed',
    description: 'The Westminster Standards and the Three Forms of Unity: text, history and meaning. Learn each catechism by heart, free.',
    intro: 'Presbyterian churches confess the Westminster Standards. Continental Reformed churches confess the Three Forms of Unity: the Heidelberg Catechism, the Belgic Confession and the Canons of Dort.',
  },
  lutheran: {
    title: 'Luther’s catechisms',
    heading: 'Lutheran',
    description: 'Luther’s Small and Large Catechisms: text, history and meaning. Learn the Small Catechism by heart, free.',
    intro: 'Martin Luther wrote two catechisms in 1529. Both are in the Book of Concord, the confession of the Lutheran church.',
  },
  scripture: {
    title: 'Bible verses to memorise',
    heading: 'Scripture',
    description: 'The Bible verses that Christians memorise most, in the King James Version, with their context and the catechism questions that cite them.',
    intro: 'These are the verses that Christians memorise most. Each page gives the text in the King James Version, the verses around it, and the catechism questions that cite it.',
  },
}

export const DOC_PAGES: DocPage[] = [
  // ------------------------------------------------------------ creeds
  {
    docId: 'apostles',
    section: 'creeds',
    slug: 'apostles',
    name: 'the Apostles’ Creed',
    title: 'The Apostles’ Creed: text, history and meaning',
    description: 'The full text of the Apostles’ Creed, where it comes from, and what each article means. Learn it by heart one phrase at a time, free.',
    lede: 'The Apostles’ Creed is the oldest summary of the Christian faith that churches still use. It has twelve short phrases in three articles: God the Father, God the Son and God the Holy Spirit.',
    facts: [
      ['Origin', 'The baptismal creed of the church in Rome'],
      ['Present form', 'About AD 700'],
      ['Length', 'About 110 words, in three articles'],
      ['Used by', 'Reformed, Lutheran, Anglican, Roman Catholic and other churches'],
    ],
    about: [
      'The apostles did not write the Apostles’ Creed. The name comes from the old belief that the creed gives the teaching of the apostles. Each phrase comes from Scripture.',
      'The creed is short because it had a short purpose. A person who came to baptism said it to confess the faith. Many churches still say it at baptism and in public worship.',
      'Many catechisms explain the faith through the Apostles’ Creed. The Heidelberg Catechism explains it in Questions 23 to 58. Luther’s Small Catechism explains it in its second part. The Westminster Shorter Catechism prints it at the end.',
    ],
    history: [
      'By about AD 200, the church in Rome asked each person at baptism three questions about the Father, the Son and the Holy Spirit. A short creed grew from these questions. Historians call it the Old Roman Creed.',
      'Churches in the West added phrases to that creed over the next centuries. Examples are "maker of heaven and earth", "he descended into hell" and "the communion of saints". The text that churches use today was complete by about AD 700.',
    ],
    outline: [
      ['God the Father', 'The Father Almighty made heaven and earth.'],
      ['God the Son', 'Jesus Christ was born of the Virgin Mary. He suffered, died, rose again and ascended. He will come again to judge.'],
      ['God the Holy Spirit', 'The Spirit gathers the church, forgives sin, raises the body and gives eternal life.'],
    ],
    faq: [
      ['Did the apostles write the Apostles’ Creed?', 'No. The creed grew from the baptismal creed of the church in Rome. Its name says that it agrees with the teaching of the apostles.'],
      ['How long does it take to memorise the Apostles’ Creed?', 'Most people can say it from memory after a few days of short practice. Hearers teaches one phrase at a time, then brings each phrase back before you forget it.'],
      ['What does "he descended into hell" mean?', 'Churches explain the phrase in different ways. The Heidelberg Catechism (Question 44) says that Christ suffered the anguish of hell for us on the cross. Luther saw it as Christ’s victory over hell.'],
    ],
  },
  {
    docId: 'nicene',
    section: 'creeds',
    slug: 'nicene',
    name: 'the Nicene Creed',
    title: 'The Nicene Creed: text, history and meaning',
    description: 'The full text of the Nicene Creed (AD 381), why the councils of Nicaea and Constantinople wrote it, and what it means. Learn it by heart, free.',
    lede: 'The Nicene Creed states what the church believes about the Trinity. It says that the Son is "of one substance with the Father". More churches use it than any other creed.',
    facts: [
      ['First written', 'Council of Nicaea, AD 325'],
      ['Present form', 'Council of Constantinople, AD 381'],
      ['Length', 'About 220 words, in three articles'],
      ['Used by', 'Orthodox, Roman Catholic, Lutheran, Reformed, Anglican and other churches'],
    ],
    about: [
      'The Nicene Creed follows the same plan as the Apostles’ Creed: the Father, the Son and the Holy Spirit. But it says more about the Son and the Spirit. It gives the words that the church chose to answer the errors of its time.',
      'Many churches say the Nicene Creed in worship, often at the Lord’s Supper. Christians of the East and of the West both confess it. No other creed has more agreement among churches.',
    ],
    history: [
      'In about AD 318, Arius, a priest of Alexandria, taught that the Son was a creature. The emperor Constantine called a council to Nicaea in AD 325. The council wrote a creed that says the Son is "of one substance" (homoousios) with the Father.',
      'The argument went on for decades. In AD 381, the Council of Constantinople gave the creed its present form. It added more about the Holy Spirit, "the Lord and giver of life, who with the Father and the Son together is worshiped and glorified".',
      'Later, churches in the West added the words "and the Son" (filioque) to the article on the Spirit. The Eastern churches did not accept this change. It is one cause of the division between East and West in 1054.',
    ],
    outline: [
      ['God the Father', 'One God, the Father Almighty, made all things, visible and invisible.'],
      ['God the Son', 'The Son is very God of very God, begotten, not made. He became man for our salvation, died, rose and will come again.'],
      ['God the Holy Spirit', 'The Spirit is Lord and gives life. The creed also confesses one church, one baptism, and the resurrection of the dead.'],
    ],
    faq: [
      ['What is the difference between the Nicene Creed and the Apostles’ Creed?', 'The Nicene Creed is longer. It says clearly that the Son is fully God, of one substance with the Father, and that the Holy Spirit is Lord. It answers the teaching of Arius.'],
      ['Which version of the Nicene Creed does Hearers use?', 'Hearers uses the traditional English text of the creed of AD 381, as Reformed and Lutheran churches say it. Each phrase links to its proof texts and to the matching phrase of the Apostles’ Creed.'],
      ['What does "of one substance with the Father" mean?', 'It means that the Son has the same divine being as the Father. He is not a lesser god or a creature. The Greek word is homoousios.'],
    ],
  },
  {
    docId: 'athanasian',
    section: 'creeds',
    slug: 'athanasian',
    name: 'the Athanasian Creed',
    title: 'The Athanasian Creed: text, history and meaning',
    description: 'The full text of the Athanasian Creed (Quicunque vult) on the Trinity and the Incarnation, with its history. Learn it by heart, part by part, free.',
    lede: 'The Athanasian Creed teaches the Trinity and the Incarnation with great precision. It begins with the Latin words "Quicunque vult": "Whosoever will be saved".',
    facts: [
      ['Written', 'Probably southern Gaul, late fifth or sixth century'],
      ['Language', 'Latin'],
      ['Length', 'About 40 verses, in two parts'],
      ['Used by', 'Lutheran and Reformed confessions, the Anglican Book of Common Prayer'],
    ],
    about: [
      'The Athanasian Creed has two parts. The first part teaches one God in three persons: "the Father is God, the Son is God, and the Holy Ghost is God. And yet they are not three Gods, but one God." The second part teaches that Christ is one person, fully God and fully man.',
      'The Reformers kept it. The Book of Concord names it one of the three ecumenical creeds. The Belgic Confession (Article 9) also receives it.',
    ],
    history: [
      'Athanasius, the bishop of Alexandria who fought Arius, did not write this creed. It is in Latin, and it uses words from later debates. Most scholars think that it comes from southern Gaul between about AD 430 and 550.',
      'The creed got its name because it teaches what Athanasius defended. Churches in the West used it in worship through the Middle Ages.',
    ],
    outline: [
      ['The Trinity', 'We worship one God in Trinity, and Trinity in Unity, without confusion of the persons or division of the substance.'],
      ['The Incarnation', 'Christ is God and man, one person. He suffered for our salvation, rose again and will come to judge.'],
    ],
    faq: [
      ['Did Athanasius write the Athanasian Creed?', 'No. It is a Latin text from about a century after his death. It has his name because it teaches the doctrine that he defended.'],
      ['Why is the Athanasian Creed hard to memorise?', 'It is long, and many lines are almost the same. Hearers teaches it in small parts, and it gives each part its own review schedule.'],
    ],
  },
  {
    docId: 'chalcedon',
    section: 'creeds',
    slug: 'chalcedon',
    name: 'the Chalcedonian Definition',
    title: 'The Chalcedonian Definition (AD 451): text and meaning',
    description: 'The text of the Definition of Chalcedon on the two natures of Christ, why the council wrote it, and what it means. Learn it by heart, free.',
    lede: 'The Definition of Chalcedon states that Christ is one person in two natures, truly God and truly man. The natures are united "without confusion, without change, without division, without separation".',
    facts: [
      ['Written', 'Council of Chalcedon, AD 451'],
      ['Subject', 'The person of Christ'],
      ['Length', 'One long paragraph'],
      ['Used by', 'Orthodox, Roman Catholic and Protestant churches'],
    ],
    about: [
      'The Definition does not explain how God became man. It sets limits. It rejects errors on each side, and it keeps what Scripture says: Christ is God, Christ is man, and Christ is one.',
      'The Reformed and Lutheran confessions follow Chalcedon when they speak about Christ. An example is the Westminster Confession, Chapter 8, Section 2.',
    ],
    history: [
      'Nestorius, bishop of Constantinople, appeared to divide Christ into two persons. Eutyches, a monk, appeared to mix the two natures into one. The Council of Chalcedon met in AD 451 to answer both errors.',
      'The council used the letter of Pope Leo I (the Tome of Leo) and the teaching of Cyril of Alexandria. The Definition calls Mary "Theotokos", the bearer of God, because the child she bore is God.',
    ],
    outline: [['Two natures, one person', 'Christ is perfect in Godhead and perfect in manhood. He is of one substance with the Father, and of one substance with us. He is like us in all things, but without sin.']],
    faq: [['What does "without confusion, without change, without division, without separation" mean?', 'The first two phrases answer Eutyches: the natures do not mix into a third thing. The last two answer Nestorius: Christ is not two persons.']],
  },
  // ------------------------------------------------------------ Reformed
  {
    docId: 'wsc',
    section: 'reformed',
    slug: 'westminster-shorter-catechism',
    name: 'the Westminster Shorter Catechism',
    short: 'the Shorter Catechism',
    title: 'Westminster Shorter Catechism: all 107 questions',
    description: 'All 107 questions and answers of the Westminster Shorter Catechism (1647), with its history and outline. Learn it by heart, one clause at a time, free.',
    lede: 'The Westminster Shorter Catechism teaches the Christian faith in 107 questions and answers. Its first question is the most famous: "What is the chief end of man? Man’s chief end is to glorify God, and to enjoy him for ever."',
    facts: [
      ['Written', 'Westminster Assembly, 1647'],
      ['Length', '107 questions'],
      ['Purpose', 'To teach children and new believers'],
      ['Used by', 'Presbyterian and Reformed Baptist churches'],
    ],
    about: [
      'The Shorter Catechism is for people "of weaker capacity": children and new Christians. Its answers are short and exact. Each answer repeats the words of its question, so each answer is a complete sentence that a child can learn alone.',
      'Many families and churches teach it from memory. A child who knows the Shorter Catechism knows the main points of Reformed theology, the Ten Commandments and the Lord’s Prayer.',
    ],
    history: [
      'The English Parliament called the Westminster Assembly in 1643 to reform the Church of England. The Assembly wrote a confession, two catechisms, and directories for worship and church government.',
      'The Assembly finished the Shorter Catechism in November 1647. The Church of Scotland approved it in 1648. It became the main catechism of Presbyterian churches around the world.',
    ],
    outline: [
      ['What we believe about God (Questions 1–38)', 'Scripture, God and his decrees, creation, providence, the fall, Christ the Redeemer and the benefits of redemption.'],
      ['The duty God requires (Questions 39–84)', 'The moral law, explained through the Ten Commandments.'],
      ['The means of grace (Questions 85–107)', 'Faith, repentance, the Word, the sacraments and prayer, with the Lord’s Prayer.'],
    ],
    faq: [
      ['How long does it take to memorise the Shorter Catechism?', 'With one new question each day, you learn all 107 in about four months. Hearers schedules the new questions and the reviews for you.'],
      ['What is the difference between the Shorter and Larger Catechisms?', 'The Shorter Catechism has 107 short answers for learners. The Larger Catechism has 196 longer answers, written to guide ministers when they teach.'],
      ['Which text does Hearers use?', 'Hearers uses the original text of 1647 with the proof texts of the Assembly. The proof texts show in the King James Version.'],
    ],
  },
  {
    docId: 'wlc',
    section: 'reformed',
    slug: 'westminster-larger-catechism',
    name: 'the Westminster Larger Catechism',
    short: 'the Larger Catechism',
    title: 'Westminster Larger Catechism: all 196 questions',
    description: 'All 196 questions and answers of the Westminster Larger Catechism (1648), with its history and outline. Learn it by heart with spaced repetition, free.',
    lede: 'The Westminster Larger Catechism explains the Christian faith in 196 questions and answers. It gives more detail than the Shorter Catechism, especially about the Ten Commandments and about the church.',
    facts: [
      ['Written', 'Westminster Assembly, 1647'],
      ['Approved', 'Church of Scotland, 1648'],
      ['Length', '196 questions'],
      ['Purpose', 'To guide ministers when they teach in public'],
    ],
    about: [
      'The Larger Catechism follows the plan of the Shorter Catechism, but it says much more. For each commandment, it lists the duties that the commandment requires and the sins that it forbids.',
      'Few people learn the whole Larger Catechism by heart. Many learn the answers on topics that the Shorter Catechism treats briefly: the church, the Lord’s Supper and the duties of each commandment.',
    ],
    history: [
      'The Westminster Assembly first tried to write one catechism. It then decided to write two: a short one for learners and a long one for teachers. It finished the Larger Catechism in October 1647. The Church of Scotland approved it in 1648.',
    ],
    outline: [
      ['What we believe about God (Questions 1–90)', 'God, creation, the covenant, Christ the Mediator, the church, and the state of the righteous and the wicked at death and judgement.'],
      ['The duty God requires (Questions 91–196)', 'The Ten Commandments in detail, sin and its penalty, the means of grace, the sacraments and prayer.'],
    ],
    faq: [['Which catechism do I learn first: the Shorter or the Larger?', 'Most people learn the Shorter Catechism first. Its answers are short. The Larger Catechism is then a good study of the same topics in more depth.']],
  },
  {
    docId: 'wcf',
    section: 'reformed',
    slug: 'westminster-confession',
    name: 'the Westminster Confession of Faith',
    short: 'the Westminster Confession',
    title: 'Westminster Confession of Faith: text and history',
    description: 'The full text of the Westminster Confession of Faith (1646) in 33 chapters, with its history and outline. Learn its key sections by heart, free.',
    lede: 'The Westminster Confession of Faith is the doctrinal standard of Presbyterian churches. In 33 chapters it states the Reformed faith, from Holy Scripture to the Last Judgement.',
    facts: [
      ['Written', 'Westminster Assembly, 1646'],
      ['Length', '33 chapters, about 170 sections'],
      ['Adopted', 'Church of Scotland, 1647'],
      ['Used by', 'Presbyterian churches. Baptist and Congregational confessions follow it closely'],
    ],
    about: [
      'The Confession begins with Scripture, because Scripture is the only rule of faith. It then teaches about God and his works, sin, Christ and salvation. It ends with the Christian life, worship, the church, the sacraments and the last things.',
      'Officers in Presbyterian churches promise to receive it as the confession of their faith. Christians learn key sections by heart, for example Chapter 1, Section 6 on the sufficiency of Scripture.',
    ],
    history: [
      'The Westminster Assembly gave the Confession to the English Parliament in December 1646. It added proof texts in 1647. The Church of Scotland adopted it in 1647.',
      'Other confessions use its text with changes. Examples are the Savoy Declaration of the Congregationalists (1658) and the Second London Baptist Confession (1689). American Presbyterians changed the chapters on the civil magistrate in 1788.',
    ],
    outline: [
      ['Scripture and God (Chapters 1–5)', 'Holy Scripture, God and the Holy Trinity, God’s eternal decree, creation and providence.'],
      ['Sin and salvation (Chapters 6–18)', 'The fall, God’s covenant, Christ the Mediator, effectual calling, justification, adoption, sanctification, faith, repentance, good works and assurance.'],
      ['The Christian life and the church (Chapters 19–31)', 'The law, Christian liberty, worship and the Sabbath, oaths, the civil magistrate, marriage, the church, the sacraments and church councils.'],
      ['The last things (Chapters 32–33)', 'The state of men after death, the resurrection and the Last Judgement.'],
    ],
    faq: [['Can I memorise the whole Westminster Confession?', 'Some people do. Most people choose the sections they use most. In Hearers, you can learn any section on its own, in any order.']],
  },
  {
    docId: 'hc',
    section: 'reformed',
    slug: 'heidelberg-catechism',
    name: 'the Heidelberg Catechism',
    title: 'Heidelberg Catechism: all 129 questions and answers',
    description: 'All 129 questions of the Heidelberg Catechism (1563) in 52 Lord’s Days, with its history and outline. Learn it by heart, one clause at a time, free.',
    lede: 'The Heidelberg Catechism is the most loved catechism of the Reformation. It begins with comfort: "What is your only comfort in life and death? That I am not my own, but belong with body and soul, both in life and in death, to my faithful Saviour Jesus Christ."',
    facts: [
      ['Written', 'Heidelberg, 1563'],
      ['Authors', 'Zacharias Ursinus, with Caspar Olevianus and others'],
      ['Length', '129 questions in 52 Lord’s Days'],
      ['Used by', 'Continental Reformed churches. One of the Three Forms of Unity'],
    ],
    about: [
      'The Heidelberg Catechism speaks to the learner as "you", and the answers say "I". This makes it personal and warm. It is divided into 52 Lord’s Days, so a church can preach through it in one year.',
      'It explains the Apostles’ Creed, the sacraments, the Ten Commandments and the Lord’s Prayer.',
    ],
    history: [
      'Frederick III, the Elector Palatine, wanted one catechism for the churches and schools of his land. He asked theologians in Heidelberg to write it. Zacharias Ursinus wrote most of it. The church of the Palatinate adopted it in 1563.',
      'The Synod of Dort (1618–1619) approved it. With the Belgic Confession and the Canons of Dort, it is one of the Three Forms of Unity of the Reformed churches.',
    ],
    outline: [
      ['Our misery (Lord’s Days 2–4)', 'The law shows us our sin.'],
      ['Our deliverance (Lord’s Days 5–31)', 'Christ the Mediator, faith, the Apostles’ Creed, justification and the sacraments.'],
      ['Our gratitude (Lord’s Days 32–52)', 'Good works, conversion, the Ten Commandments and prayer, with the Lord’s Prayer.'],
    ],
    faq: [
      ['What is a Lord’s Day in the Heidelberg Catechism?', 'The 129 questions are divided into 52 groups, one for each Sunday of the year. Many Reformed churches preach on one Lord’s Day each Sunday.'],
      ['How long does it take to memorise the Heidelberg Catechism?', 'With one new question each day, you learn all 129 in about four months. With one Lord’s Day each week, you learn it in a year.'],
    ],
  },
  {
    docId: 'bc',
    section: 'reformed',
    slug: 'belgic-confession',
    name: 'the Belgic Confession',
    title: 'The Belgic Confession (1561): text and history',
    description: 'The full text of the Belgic Confession of Faith (1561) in 37 articles, with its history and outline. Learn its articles by heart, free.',
    lede: 'The Belgic Confession is the oldest of the Three Forms of Unity. Guido de Brès wrote it in 1561 for the persecuted Reformed churches of the Low Countries.',
    facts: [
      ['Written', '1561, by Guido de Brès'],
      ['Length', '37 articles'],
      ['Adopted', 'Synod of Dort, 1619 (revised text)'],
      ['Used by', 'Continental Reformed churches. One of the Three Forms of Unity'],
    ],
    about: [
      'The confession teaches the Reformed faith in 37 articles. It begins with God and Scripture, and it ends with the Last Judgement. Its articles on Scripture, justification and the church are clear and short.',
      'It also shows that the Reformed churches were not rebels. It confesses the creeds of the early church, and it honours the civil government.',
    ],
    history: [
      'King Philip II of Spain ruled the Low Countries and persecuted Protestants there. In 1561, Guido de Brès wrote this confession to show that the Reformed believers taught the faith of Scripture. In 1562, believers threw a copy over the wall of the castle at Tournai, with a letter to the king.',
      'De Brès died as a martyr in 1567. Reformed synods adopted the confession, and the Synod of Dort revised it in 1619.',
    ],
    outline: [
      ['God and Scripture (Articles 1–11)', 'The one God, how we know him, Holy Scripture and the Trinity.'],
      ['Creation, sin and Christ (Articles 12–21)', 'Creation, providence, the fall, election, and Christ the Mediator.'],
      ['Salvation (Articles 22–26)', 'Faith, justification, sanctification and the intercession of Christ.'],
      ['The church and the end (Articles 27–37)', 'The church, its marks and government, the sacraments, the civil government and the Last Judgement.'],
    ],
    faq: [['What are the Three Forms of Unity?', 'They are the Belgic Confession (1561), the Heidelberg Catechism (1563) and the Canons of Dort (1619). Continental Reformed churches confess all three.']],
  },
  {
    docId: 'dort',
    section: 'reformed',
    slug: 'canons-of-dort',
    name: 'the Canons of Dort',
    title: 'The Canons of Dort (1619): text and history',
    description: 'The full text of the Canons of Dort (1619), the Reformed answer to the Remonstrants, with its history and outline. Learn its articles by heart, free.',
    lede: 'The Canons of Dort are the answer of the Synod of Dort to the Remonstrants, the followers of Jacobus Arminius. They are the source of the "five points of Calvinism".',
    facts: [
      ['Written', 'Synod of Dort, 1618–1619'],
      ['Length', 'Five heads of doctrine, with articles and rejections of errors'],
      ['Used by', 'Continental Reformed churches. One of the Three Forms of Unity'],
    ],
    about: [
      'The Canons are not a full confession. They answer five points that the Remonstrants raised. Each head of doctrine has articles that teach the truth and paragraphs that reject errors. The third and fourth heads are together.',
      'The Canons are pastoral as well as exact. They often speak about the comfort of believers and about the preaching of the gospel to all.',
    ],
    history: [
      'After the death of Arminius in 1609, his followers wrote the Remonstrance of 1610. It had five articles on election, the atonement, grace and perseverance. The Dutch States General called a national synod at Dordrecht (Dort). Delegates came from Reformed churches in Britain, Germany and Switzerland.',
      'The synod met from November 1618 to May 1619. It rejected the five articles and wrote the Canons in their place.',
    ],
    outline: [
      ['First head: divine election and reprobation', 'God chose some to salvation by grace alone, not because of foreseen faith.'],
      ['Second head: the death of Christ', 'The death of Christ is of infinite value, and it saves all the elect.'],
      ['Third and fourth heads: corruption and conversion', 'Man is dead in sin. The Spirit renews the will by grace that is effective.'],
      ['Fifth head: the perseverance of the saints', 'God keeps his people in faith to the end.'],
    ],
    faq: [['Are the Canons of Dort the five points of Calvinism?', 'The five points come from the Canons. The acronym TULIP is much later, from the twentieth century, and it does not use the words of the Canons.']],
  },
  {
    docId: 'decalogue',
    section: 'scripture',
    slug: 'ten-commandments',
    name: 'the Ten Commandments',
    title: 'The Ten Commandments (KJV): text and meaning',
    description: 'The Ten Commandments from Exodus 20 in the King James Version, in their short and full forms, with the catechism questions that explain them. Learn them by heart, free.',
    lede: 'God spoke the Ten Commandments at Mount Sinai and wrote them on two tables of stone. They are in Exodus 20 and Deuteronomy 5. Every catechism of the Reformation explains them.',
    facts: [
      ['Source', 'Exodus 20:1–17 and Deuteronomy 5:6–21'],
      ['Text', 'King James Version'],
      ['Forms', 'The full text, and the short form that catechisms use'],
    ],
    about: [
      'The first table teaches our duty to God. The second table teaches our duty to our neighbour. Jesus summarised them: love God with all your heart, and love your neighbour as yourself.',
      'Churches number the commandments in two ways. Reformed churches count the command against images as the second commandment. Lutheran and Roman Catholic churches join it to the first, and they divide the command against coveting into two.',
    ],
    history: [
      'The Westminster Shorter Catechism explains the commandments in Questions 41 to 81. The Heidelberg Catechism explains them in Questions 92 to 115. Luther’s Small Catechism begins with them.',
    ],
    outline: [
      ['The first table (Commandments 1–4)', 'No other gods, no images, the name of the Lord, and the Sabbath day.'],
      ['The second table (Commandments 5–10)', 'Parents, life, marriage, property, truth and contentment.'],
    ],
    faq: [['Why do Lutherans and Reformed number the commandments differently?', 'Scripture says that there are ten, but it does not number them. Augustine joined the commands against other gods and against images. Most Reformers, after the early church fathers, kept them apart.']],
  },
  // ------------------------------------------------------------ Lutheran
  {
    docId: 'lsc',
    section: 'lutheran',
    slug: 'small-catechism',
    name: 'Luther’s Small Catechism',
    short: 'the Small Catechism',
    title: 'Luther’s Small Catechism: full text and history',
    description: 'The full text of Luther’s Small Catechism (1529), with its history and its six chief parts. Learn it by heart, one phrase at a time, free.',
    lede: 'Martin Luther wrote the Small Catechism in 1529 for the head of each household, to teach the faith at home. For each part, it asks a simple question: "What does this mean?"',
    facts: [
      ['Written', '1529, by Martin Luther'],
      ['Parts', 'Six chief parts, with prayers and a table of duties'],
      ['Translation', 'Triglot Concordia (1921)'],
      ['Used by', 'Lutheran churches. Part of the Book of Concord (1580)'],
    ],
    about: [
      'The Small Catechism explains the Ten Commandments, the Apostles’ Creed and the Lord’s Prayer. It then teaches Baptism, Confession and the Sacrament of the Altar. Each explanation is short, so that children can learn it by heart.',
      'Lutheran churches teach the Small Catechism to children before confirmation. Many Lutherans can still say "What does this mean?" and its answers from memory.',
    ],
    history: [
      'In 1528 and 1529, Luther visited the churches of Saxony. He found that many people and many pastors knew almost nothing of the faith. He wrote the Small Catechism for them in 1529, first as wall charts and then as a book.',
      'The Book of Concord of 1580 included it as a confession of the Lutheran church.',
    ],
    outline: [
      ['The Ten Commandments', 'What God requires of us.'],
      ['The Creed', 'What God gives us: creation, redemption and sanctification.'],
      ['The Lord’s Prayer', 'How we ask God for what we need.'],
      ['Baptism, Confession and the Lord’s Supper', 'How God gives us his grace through Word and Sacrament.'],
    ],
    faq: [['What is the difference between the Small and Large Catechisms?', 'The Small Catechism is short, for families and children. The Large Catechism explains the same parts at length, for pastors and teachers.']],
  },
  {
    docId: 'llc',
    section: 'lutheran',
    groupsShown: 3,
    slug: 'large-catechism',
    name: 'Luther’s Large Catechism',
    short: 'the Large Catechism',
    title: 'Luther’s Large Catechism: text and history',
    description: 'Luther’s Large Catechism (1529) for pastors and teachers: its history, its parts and its full text. Learn its key paragraphs by heart, free.',
    lede: 'Luther’s Large Catechism explains the chief parts of the faith at length, for pastors, teachers and heads of households. Luther wrote it from his sermons of 1528.',
    facts: [
      ['Written', '1529, by Martin Luther'],
      ['Length', 'Two prefaces and five parts'],
      ['Translation', 'Triglot Concordia (1921)'],
      ['Used by', 'Lutheran churches. Part of the Book of Concord (1580)'],
    ],
    about: [
      'The Large Catechism is not in questions and answers. It is a teaching book in plain, strong language. Luther says in its preface that he himself prays the catechism each day as a child does.',
      'Its explanation of the First Commandment is famous: "A god means that from which we are to expect all good and in which we are to take refuge in all distress."',
    ],
    history: [
      'Luther preached three series of sermons on the catechism in 1528. He made them into the Large Catechism, published in April 1529, a few weeks before the Small Catechism.',
    ],
    outline: [
      ['The Ten Commandments', 'A long explanation of each commandment.'],
      ['The Creed', 'Creation, redemption and sanctification.'],
      ['The Lord’s Prayer', 'Why we pray, and each petition.'],
      ['Baptism and the Sacrament of the Altar', 'What the sacraments are, what they give, and who receives them with benefit.'],
    ],
    faq: [['Can I memorise the Large Catechism?', 'It is long, so most people learn chosen paragraphs. In Hearers, you can learn any paragraph on its own.']],
  },
]

export const docPage = (section: Section, slug: string) => DOC_PAGES.find((d) => d.section === section && d.slug === slug)
export const pageForDoc = (docId: string) => DOC_PAGES.find((d) => d.docId === docId)
export const pagePath = (d: { section: Section; slug: string }) => `/${d.section}/${d.slug}/`
