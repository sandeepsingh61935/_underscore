import { describe, expect, it } from 'vitest';

import {
  addMember,
  hasMember,
  parseMemberDrag,
  placeToMember,
  removeMember,
  serializeMemberDrag,
} from '../project-members';

describe('project-members', () => {
  it('maps places to members', () => {
    expect(placeToMember({ type: 'domain', domain: 'a.com' })).toEqual({
      kind: 'domain',
      domain: 'a.com',
    });
    expect(
      placeToMember({
        type: 'section',
        domain: 'a.com',
        sectionKey: '/docs',
      }),
    ).toEqual({ kind: 'section', domain: 'a.com', sectionKey: '/docs' });
    expect(
      placeToMember({ type: 'project', projectId: 'p1' }),
    ).toBeNull();
  });

  it('add/remove is idempotent', () => {
    const m = { kind: 'domain' as const, domain: 'a.com' };
    const one = addMember([], m);
    expect(hasMember(one, m)).toBe(true);
    expect(addMember(one, m)).toHaveLength(1);
    expect(removeMember(one, m)).toHaveLength(0);
  });

  it('round-trips drag payload', () => {
    const m = {
      kind: 'section' as const,
      domain: 'a.com',
      sectionKey: '/x',
    };
    expect(parseMemberDrag(serializeMemberDrag(m))).toEqual(m);
  });
});
