// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import FrontMatterEditor from './FrontMatterEditor.svelte';

afterEach(cleanup);

describe('FrontMatterEditor', () => {
	const defaultFm = {
		title: 'Test Title',
		date: '2026-06-15',
		draft: true,
		description: 'A test description',
		tags: ['tag1', 'tag2'],
		categories: ['cat1'],
	};

	it('renders all fields with values', () => {
		render(FrontMatterEditor, { frontmatter: defaultFm });
		expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
		expect(screen.getByDisplayValue('2026-06-15')).toBeTruthy();
		expect(screen.getByDisplayValue('A test description')).toBeTruthy();
		expect(screen.getByDisplayValue('tag1')).toBeTruthy();
		expect(screen.getByDisplayValue('tag2')).toBeTruthy();
	});

	it('renders empty state when no frontmatter', () => {
		render(FrontMatterEditor, { frontmatter: {} });
		const inputs = screen.getAllByDisplayValue('');
		expect(inputs.length).toBeGreaterThan(0);
	});

	it('calls onChange when title is edited', async () => {
		const onChange = vi.fn();
		render(FrontMatterEditor, { frontmatter: { title: 'Old' }, onChange });
		const input = screen.getByDisplayValue('Old') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'New Title' } });
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
	});

	it('calls onChange when draft toggle changes', async () => {
		const onChange = vi.fn();
		render(FrontMatterEditor, { frontmatter: { draft: true }, onChange });
		const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
		await fireEvent.click(checkbox);
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ draft: false }));
	});

	it('calls onChange when tags are updated', async () => {
		const onChange = vi.fn();
		render(FrontMatterEditor, { frontmatter: { tags: ['old'] }, onChange });
		const input = screen.getByDisplayValue('old') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'newtag' } });
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['newtag'] }));
	});

	it('shows description character counter', () => {
		render(FrontMatterEditor, { frontmatter: { description: 'Hello' } });
		expect(screen.getByText('5/160')).toBeTruthy();
	});
});
