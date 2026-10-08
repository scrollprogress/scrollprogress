// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { removeCssVar, writeCssVar } from '../../lib/utils/css-var-utils';

describe('css var utils', () => {
    it('writes a CSS custom property', () => {
        const element = document.createElement('div');

        writeCssVar(element, '--scroll-progress', 0.5);

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.5');
    });

    it('writes string values', () => {
        const element = document.createElement('div');

        writeCssVar(element, '--scroll-progress-percent', '50%');

        expect(element.style.getPropertyValue('--scroll-progress-percent')).toBe('50%');
    });

    it('does nothing when writing a null CSS var name', () => {
        const element = document.createElement('div');

        writeCssVar(element, null, 0.5);

        expect(element.getAttribute('style')).toBeNull();
    });

    it('removes a CSS custom property', () => {
        const element = document.createElement('div');

        element.style.setProperty('--scroll-progress', '0.5');

        removeCssVar(element, '--scroll-progress');

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('');
    });

    it('does nothing when removing a null CSS var name', () => {
        const element = document.createElement('div');

        element.style.setProperty('--scroll-progress', '0.5');

        removeCssVar(element, null);

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.5');
    });
});
