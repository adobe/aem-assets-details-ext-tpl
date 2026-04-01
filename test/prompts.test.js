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
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
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

        it('should prompt for modal size when needsModal and modal type is modal', async () => {
            const mockManifest = {};
            inquirer.prompt
                .mockResolvedValueOnce({
                    label: 'Modal Action',
                    icon: 'Settings',
                    needsModal: true,
                })
                .mockResolvedValueOnce({ modalTitle: 'My Modal', modalType: 'modal' })
                .mockResolvedValueOnce({ modalSize: 'M' });

            await nestedHeaderMenuPrompts(mockManifest, 'headerMenuButtons');

            expect(mockManifest.headerMenuButtons[0]).toEqual(
                expect.objectContaining({
                    label: 'Modal Action',
                    needsModal: true,
                    modalTitle: 'My Modal',
                    modalType: 'modal',
                    modalSize: 'M',
                    id: 'modal-action',
                    componentName: 'ModalModalAction',
                })
            );
        });

        it('should skip modal size when modal type is fullscreen', async () => {
            const mockManifest = {};
            inquirer.prompt
                .mockResolvedValueOnce({
                    label: 'Full Screen',
                    icon: 'FullScreen',
                    needsModal: true,
                })
                .mockResolvedValueOnce({ modalTitle: 'FS', modalType: 'fullscreen' });

            await nestedHeaderMenuPrompts(mockManifest, 'headerMenuButtons');

            expect(mockManifest.headerMenuButtons[0]).toEqual(
                expect.objectContaining({
                    modalType: 'fullscreen',
                    componentName: 'ModalFullScreen',
                })
            );
            expect(mockManifest.headerMenuButtons[0].modalSize).toBeUndefined();
        });

        it('should filter icons when autocomplete source receives input', async () => {
            const mockManifest = {};
            inquirer.prompt.mockResolvedValue({
                label: 'L',
                icon: 'Add',
                needsModal: false,
            });

            await nestedHeaderMenuPrompts(mockManifest, 'headerMenuButtons');

            const questions = inquirer.prompt.mock.calls[0][0];
            const iconQuestion = questions.find((q) => q.name === 'icon');
            const filtered = await iconQuestion.source({}, 'zoom');
            expect(filtered.length).toBeGreaterThan(0);
            expect(filtered.every((i) => i.toLowerCase().includes('zoom'))).toBe(true);

            const allIcons = await iconQuestion.source({}, '');
            expect(allIcons.length).toBeGreaterThan(100);
        });

        it('should validate empty label and modal title', async () => {
            inquirer.prompt.mockResolvedValue({
                label: 'x',
                icon: 'Add',
                needsModal: false,
            });
            await nestedHeaderMenuPrompts({}, 'headerMenuButtons');

            const questions = inquirer.prompt.mock.calls[0][0];
            const labelQ = questions.find((q) => q.name === 'label');
            expect(labelQ.validate('')).toBe('Required.');

            inquirer.prompt
                .mockResolvedValueOnce({ label: 'A', icon: 'Add', needsModal: true })
                .mockResolvedValueOnce({ modalTitle: 'T', modalType: 'modal' })
                .mockResolvedValueOnce({ modalSize: 'S' });
            await nestedHeaderMenuPrompts({}, 'headerMenuButtons');
            const modalRound = inquirer.prompt.mock.calls[2][0];
            const titleQ = modalRound.find((q) => q.name === 'modalTitle');
            expect(titleQ.validate('')).toBe('Required.');
        });

        it('should log errors when inquirer rejects', async () => {
            inquirer.prompt.mockRejectedValueOnce(new Error('fail'));
            await nestedHeaderMenuPrompts({}, 'headerMenuButtons');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('promptMainMenu flows', () => {
        it('should add a side panel and then finish from main menu', async () => {
            const manifest = {};
            let mainMenuCalls = 0;
            inquirer.prompt.mockImplementation((config) => {
                if (config && config.type === 'list' && config.message === 'What would you like to do next?') {
                    mainMenuCalls += 1;
                    if (mainMenuCalls === 1) {
                        const choice = config.choices.find(
                            (c) => c.name === 'Add a side panel to the Details View'
                        );
                        return Promise.resolve({ execute: choice.value });
                    }
                    return Promise.resolve({
                        execute: () => Promise.resolve(true),
                    });
                }
                if (Array.isArray(config) && config[0] && config[0].name === 'tooltip') {
                    return Promise.resolve({
                        tooltip: 'My Tooltip',
                        title: 'My Title',
                        icon: 'Asset',
                    });
                }
                return Promise.reject(new Error(`unexpected prompt: ${JSON.stringify(config)}`));
            });

            await promptMainMenu(manifest);

            expect(manifest.detailsSidePanels).toHaveLength(1);
            expect(manifest.detailsSidePanels[0].componentName).toMatch(/^Panel/);
        });

        it('should add a runtime action and then finish', async () => {
            const manifest = {};
            let mainMenuCalls = 0;
            inquirer.prompt.mockImplementation((config) => {
                if (config && config.type === 'list' && config.message === 'What would you like to do next?') {
                    mainMenuCalls += 1;
                    if (mainMenuCalls === 1) {
                        const choice = config.choices.find((c) => c.name === 'Add server-side handler');
                        return Promise.resolve({ execute: choice.value });
                    }
                    return Promise.resolve({
                        execute: () => Promise.resolve(true),
                    });
                }
                if (config && config.name === 'actionName') {
                    return Promise.resolve({ actionName: 'my-runtime-action' });
                }
                return Promise.reject(new Error(`unexpected prompt: ${JSON.stringify(config)}`));
            });

            await promptMainMenu(manifest);

            expect(manifest.runtimeActions).toEqual([{ name: 'my-runtime-action' }]);
        });

        it('should open guide menu, show help, then go back and exit', async () => {
            const manifest = {};
            let mainMenuCalls = 0;
            let guideCalls = 0;
            inquirer.prompt.mockImplementation((config) => {
                if (config && config.type === 'list' && config.message === 'What would you like to do next?') {
                    mainMenuCalls += 1;
                    if (mainMenuCalls === 1) {
                        const choice = config.choices.find((c) => c.name === "I don't know");
                        return Promise.resolve({ execute: choice.value });
                    }
                    return Promise.resolve({
                        execute: () => Promise.resolve(true),
                    });
                }
                if (config && config.type === 'list' && config.message === 'What about this then?') {
                    guideCalls += 1;
                    if (guideCalls === 1) {
                        const help = config.choices.find((c) => c.name === 'Find some help');
                        return Promise.resolve({ execute: help.value });
                    }
                    const goBack = config.choices.find((c) => c.name === 'Go back');
                    return Promise.resolve({ execute: goBack.value });
                }
                return Promise.reject(new Error(`unexpected prompt: ${JSON.stringify(config)}`));
            });

            await promptMainMenu(manifest);

            expect(guideCalls).toBe(2);
            expect(console.log).toHaveBeenCalled();
        });

        it('should log when main menu prompt rejects', async () => {
            inquirer.prompt.mockRejectedValueOnce(new Error('main fail'));
            await promptMainMenu({});
            expect(console.log).toHaveBeenCalled();
        });
    });
});