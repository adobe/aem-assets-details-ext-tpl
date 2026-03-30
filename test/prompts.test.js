/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const inquirer = require('inquirer');
const { promptTopLevelFields, promptMainMenu, nestedHeaderMenuPrompts } = require('../src/prompts');

jest.mock('inquirer');

describe('prompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('promptTopLevelFields', () => {
        it('should prompt for name, description, and version and update the manifest', async () => {
            const mockManifest = {};
            const mockAnswers = {
                name: 'Test Extension',
                description: 'This is a test extension',
                version: '1.0.0'
            };

            inquirer.prompt.mockResolvedValue(mockAnswers);

            await promptTopLevelFields(mockManifest);

            expect(mockManifest).toEqual({
                name: 'Test Extension',
                id: 'test-extension',
                description: 'This is a test extension',
                version: '1.0.0'
            });
        });

        it('should validate wrong input', async () => {
            const mockManifest = {};
            const mockIncorrectAnswers = {
                name: '',
                description: '',
                version: 'invalid'
            };
            const mockCorrectAnswers = {
                name: '',
                description: 'This is a test extension',
                version: '1.0.0'
            };
            const actualValidationResults = {};
            const expectedValidationResults = {
                name: 'Required.',
                description: 'Required.',
                version: 'Required. Must match semantic versioning rules.'
            };

            inquirer.prompt.mockImplementation(async (questions) => {
                Object.keys(mockIncorrectAnswers).map((key) => {
                    const question = questions.find((question) => question.name === key);
                    actualValidationResults[key] = question.validate(mockIncorrectAnswers[key]);
                });
                return mockCorrectAnswers;
            });
            await promptTopLevelFields(mockIncorrectAnswers);

            await expect(actualValidationResults).toEqual(expectedValidationResults);
        });
    });

    describe('promptMainMenu', () => {
        it('should prompt the main menu and execute the selected action', async () => {
            const mockManifest = {};
            const mockAnswers = {
                execute: jest.fn().mockResolvedValue(true)
            };

            inquirer.prompt.mockResolvedValue(mockAnswers);

            await promptMainMenu(mockManifest);

            expect(inquirer.prompt).toHaveBeenCalledWith(expect.objectContaining({
                type: 'list',
                name: 'execute',
                message: 'What would you like to do next?',
                choices: expect.any(Array)
            }));
            expect(mockAnswers.execute).toHaveBeenCalled();
        });
    });

    describe('promptNestedHeaderMenuPrompts', () => {
        it('should use custom label prompt message for header menu button', async () => {
            const mockManifest = {};
            const mockAnswers = {
                label: 'Custom Header Button',
                icon: 'Settings',
                needsModal: false,
            };

            inquirer.prompt.mockResolvedValue(mockAnswers);

            await nestedHeaderMenuPrompts(mockManifest, 'headerMenuButtons');

            expect(inquirer.prompt).toHaveBeenCalledWith([
                expect.objectContaining({
                    type: 'input',
                    name: 'label',
                    message: 'Please provide label for the Header Menu button:',
                    validate: expect.any(Function),
                }),
                expect.objectContaining({
                    type: 'autocomplete',
                    name: 'icon',
                    message: 'Please select React Spectrum icon for the Header Menu button:',
                    source: expect.any(Function),
                }),
                expect.objectContaining({
                    type: 'confirm',
                    name: 'needsModal',
                    message: 'Do you need to show a modal for the action?',
                    default: false,
                }),
            ]);
        });

        it('should store header menu buttons in correct manifest property', async () => {
            const mockManifest = {};
            const mockAnswers = {
                label: 'Test Header Button',
                icon: 'Help',
                needsModal: false,
            };

            inquirer.prompt.mockResolvedValue(mockAnswers);

            await nestedHeaderMenuPrompts(mockManifest, 'headerMenuButtons');

            expect(mockManifest.headerMenuButtons).toBeDefined();
            expect(mockManifest.headerMenuButtons).toHaveLength(1);

            const addedButtons = mockManifest.headerMenuButtons[0];
            expect(addedButtons.label).toBe('Test Header Button');
            expect(addedButtons.icon).toBe('Help');
            expect(addedButtons.id).toBe('test-header-button');
        });
    });
});