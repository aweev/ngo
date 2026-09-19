import { describe, expect, it } from 'vitest';
import {
    applicationPath,
    donationPath,
    programCategoryPath,
    programsPath,
    projectPath,
    volunteerPath,
} from '@/lib/program-routes';

describe('program routes', () => {
    it('builds the programs hub and category paths', () => {
        expect(programsPath()).toBe('/public/programs');
        expect(programCategoryPath('education')).toBe('/public/programs/education');
    });

    it('encodes project slugs', () => {
        expect(projectPath('education', 'girls in tech')).toBe('/public/programs/education/girls%20in%20tech');
    });

    it('builds project application paths', () => {
        expect(applicationPath('health', 'clinic')).toBe('/public/programs/health/clinic/apply');
    });
});

describe('donationPath', () => {
    it('returns the bare donate route with no query', () => {
        expect(donationPath({})).toBe('/public/get-involved/donate');
    });

    it('encodes project/fund/amount query params', () => {
        expect(donationPath({ project: 'p 1', fund: 'health', amount: 50 })).toBe(
            '/public/get-involved/donate?project=p+1&fund=health&amount=50',
        );
    });
});

describe('volunteerPath', () => {
    it('returns the bare volunteer route with no query', () => {
        expect(volunteerPath({})).toBe('/public/get-involved/volunteer');
    });

    it('encodes the interest category', () => {
        expect(volunteerPath({ interest: 'education' })).toBe(
            '/public/get-involved/volunteer?interest=education',
        );
    });
});