#!/usr/bin/env node
/**
 * New component that follows the folder convention (src/components/CLAUDE.md):
 *
 *   pnpm component Badge                 → src/components/UI/Badge.tsx
 *   pnpm component Badge --test          → src/components/UI/Badge/{Badge.tsx,Badge.test.tsx,index.ts}
 *   pnpm component Sidebar --layout      → src/components/layouts/Sidebar.tsx
 *   pnpm component Counter --client      → adds 'use client'
 *
 * Flags combine. A component WITH a test lives in a folder named after it,
 * `index.ts` only re-exports; single-file components stay flat.
 */

import { mkdirSync } from 'node:fs';

import { abs, exists, fail, formatFiles, say, write } from '../lib/project.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [name] = args.filter((a) => !a.startsWith('--'));

if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name)) {
  fail('Usage: pnpm component <Name> [--test] [--layout] [--client] — Name in PascalCase');
}

const layout = flags.has('--layout');
const withTest = flags.has('--test');
const client = flags.has('--client');
const base = layout ? 'src/components/layouts' : 'src/components/UI';
const importBase = layout ? '@/components/layouts' : '@/components/UI';

if (exists(`${base}/${name}.tsx`) || exists(`${base}/${name}`))
  fail(`${base}/${name} already exists`);

const file = withTest ? `${base}/${name}/${name}.tsx` : `${base}/${name}.tsx`;
const modulePath = withTest ? `${importBase}/${name}/${name}` : `${importBase}/${name}`;

if (withTest) mkdirSync(abs(`${base}/${name}`), { recursive: true });

write(
  file,
  `${client ? "'use client';\n\n" : ''}import { cn } from '@/lib/cn';

import type { ReactNode } from 'react';

export type ${name}Props = {
  className?: string;
  children?: ReactNode;
};

export function ${name}({ className, children }: ${name}Props) {
  return <div className={cn(className)}>{children}</div>;
}
`,
);

const touched = [file];

if (withTest) {
  write(
    `${base}/${name}/index.ts`,
    `export { ${name} } from '${modulePath}';
export type { ${name}Props } from '${modulePath}';
`,
  );
  write(
    `${base}/${name}/${name}.test.tsx`,
    `// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';

import { ${name} } from '${modulePath}';

describe('${name}', () => {
  it('renders its children', () => {
    render(<${name}>content</${name}>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('merges className', () => {
    render(<${name} className="custom">content</${name}>);
    expect(screen.getByText('content')).toHaveClass('custom');
  });
});
`,
  );
  touched.push(`${base}/${name}/index.ts`, `${base}/${name}/${name}.test.tsx`);
}

await formatFiles(touched);

console.log('');
for (const f of touched) say('✓', f);
console.log(`
    Import:  import { ${name} } from '${importBase}/${name}';
${layout ? '    Note:    knip reports it as an unused file until something imports it.\n' : ''}`);
