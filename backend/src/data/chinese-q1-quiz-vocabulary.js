import source from './chinese-q1-user-vocabulary.json' with {type:'json'};

// The newest user-supplied list supersedes earlier PDF extractions. Preserve
// every listed term, compound, number and name, in the supplied order.
export const q1QuizVocabulary=source.lessons.map(lesson=>({...lesson,source:source.source,sha256:source.sha256}));
export const q1VocabularySource=source;
export const q1QuizDefinitions=Object.fromEntries(q1QuizVocabulary.flatMap(lesson=>lesson.words.map(word=>[`${lesson.number}:${word.hanzi}`,{pinyin:word.pinyin,meaning:word.meaning}])));
