import type { APIRoute, GetStaticPaths } from 'astro';
import { downloads, type Download } from '../../lib/downloads';

export const getStaticPaths = (() =>
  downloads.map((d) => ({ params: { file: d.file }, props: { d } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { d } = props as { d: Download };
  return new Response(d.body, { headers: { 'Content-Type': d.type } });
};
