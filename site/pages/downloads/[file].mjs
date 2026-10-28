import { downloads } from '../../lib/downloads.mjs';

export const kind = 'file';

export const paths = () => downloads.map((d) => ({ params: { file: d.file }, props: { d } }));

/** @param {{ props: { d: import('../../lib/downloads.mjs').Download } }} ctx */
export const render = ({ props }) => props.d.body;
