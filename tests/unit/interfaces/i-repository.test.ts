/**
 * IRepository Interface Tests (5 tests)
 * 
 * Verifies that InMemoryRepository implements IRepository correctly
 * Focus: Behavioral testing with minimal mocking
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { createTestHighlight } from '../../helpers/test-fixtures';

import type { IRepository } from '@/shared/interfaces/i-repository';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';


describe('IRepository Interface (5 tests)', () => {
    let repository: InMemoryHighlightRepository;

    beforeEach(() => {
        repository = new InMemoryHighlightRepository();
    });

    it('1. implements IRepository methods', () => {
        // Assert: Has all required methods from IRepository<HighlightDataV2>
        expect(typeof repository.add).toBe('function');
        expect(typeof repository.findById).toBe('function');
        expect(typeof repository.remove).toBe('function');
        expect(typeof repository.findAll).toBe('function');
        expect(typeof repository.count).toBe('function');
        expect(typeof repository.exists).toBe('function');
        expect(typeof repository.clear).toBe('function');
    });

    it('2. add() + findById() round trip works', async () => {
        // Arrange
        const highlight = createTestHighlight({ text: 'Test highlight' });

        // Act
        await repository.add(highlight);
        const retrieved = await repository.findById(highlight.id);

        // Assert
        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(highlight.id);
        expect(retrieved?.text).toBe('Test highlight');
    });

    it('3. remove() actually removes', async () => {
        // Arrange
        const highlight = createTestHighlight();
        await repository.add(highlight);
        expect(repository.count()).toBe(1);

        // Act
        await repository.remove(highlight.id);

        // Assert
        expect(repository.count()).toBe(0);
        const retrieved = await repository.findById(highlight.id);
        expect(retrieved).toBeNull();
    });

    it('4. count() matches findAll().length', async () => {
        // Arrange
        await repository.add(createTestHighlight());
        await repository.add(createTestHighlight());
        await repository.add(createTestHighlight());

        // Act
        const count = repository.count();
        const all = await repository.findAll();

        // Assert
        expect(count).toBe(3);
        expect(all.length).toBe(count); // ✅ Consistency check
    });

    it('5. can swap implementations (Liskov Substitution)', async () => {
        // Arrange: Function that accepts IRepository
        async function useRepository(repo: IRepository<HighlightDataV2>) {
            const highlight = createTestHighlight();
            await repo.add(highlight);
            return await repo.findById(highlight.id);
        }

        // Act: Pass concrete implementation
        const result = await useRepository(repository);

        // Assert: Works without knowing concrete type
        expect(result).not.toBeNull();
        // ✅ Proves Liskov Substitution Principle
    });
});
