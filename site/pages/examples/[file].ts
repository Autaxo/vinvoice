import type { APIRoute, GetStaticPaths } from 'astro';
import { corpus, type CorpusFile } from '../../lib/corpus';

export const getStaticPaths = (() =>
  corpus.map((f) => ({ params: { file: f.name }, props: { f } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { f } = props as { f: CorpusFile };
  return new Response(f.xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
