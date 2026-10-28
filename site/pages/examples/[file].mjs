import { corpus } from '../../lib/corpus.mjs';

export const kind = 'file';

export const paths = () => corpus.map((f) => ({ params: { file: f.name }, props: { f } }));

/** @param {{ props: { f: import('../../lib/corpus.mjs').CorpusFile } }} ctx */
export const render = ({ props }) => props.f.xml;
