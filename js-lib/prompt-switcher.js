/**
 * Prompt Switcher - Standalone JavaScript Library for Chrome Extensions
 * Ported from Python library for client-side use
 */

/**
 * PromptSwitcher - Main class for routing user requests to appropriate prompts
 */
class PromptSwitcher {
    /**
     * @param {string} apiKey - OpenAI API key
     * @param {Array} promptsData - Array of prompt objects with id, name, description, and prompt fields
     * @param {string} model - OpenAI model (default: "gpt-4o")
     */
    constructor(apiKey, promptsData, model = "gpt-4o") {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('apiKey must be a non-empty string');
        }

        this.apiKey = apiKey;
        this.model = model;
        
        // Validate and set prompts data
        this._validatePrompts(promptsData);
        this.promptsData = promptsData;
        this.prompts = this._buildPromptsMap();
    }

    /**
     * Validates the prompts data structure
     * @private
     * @param {*} promptsData - The prompts data to validate
     * @throws {Error} If validation fails
     */
    _validatePrompts(promptsData) {
        // Check if it's an array
        if (!Array.isArray(promptsData)) {
            throw new Error('promptsData must be an array');
        }

        // Check if array is not empty
        if (promptsData.length === 0) {
            throw new Error('promptsData array cannot be empty');
        }

        // Track IDs for uniqueness check
        const seenIds = new Set();

        // Validate each prompt object
        for (let i = 0; i < promptsData.length; i++) {
            const prompt = promptsData[i];
            const index = i + 1; // 1-based index for error messages

            // Check if prompt is an object
            if (!prompt || typeof prompt !== 'object' || Array.isArray(prompt)) {
                throw new Error(`Prompt at index ${index} must be an object`);
            }

            // Check for required field: id
            if (!('id' in prompt)) {
                throw new Error(`Prompt at index ${index} is missing required field 'id'`);
            }
            if (prompt.id === null || prompt.id === undefined) {
                throw new Error(`Prompt at index ${index} has invalid 'id' (cannot be null or undefined)`);
            }
            // Check ID uniqueness
            if (seenIds.has(prompt.id)) {
                throw new Error(`Prompt at index ${index} has duplicate 'id': ${prompt.id}`);
            }
            seenIds.add(prompt.id);

            // Check for required field: name
            if (!('name' in prompt)) {
                throw new Error(`Prompt at index ${index} is missing required field 'name'`);
            }
            if (typeof prompt.name !== 'string' || prompt.name.trim().length === 0) {
                throw new Error(`Prompt at index ${index} has invalid 'name' (must be a non-empty string)`);
            }

            // Check for required field: description
            if (!('description' in prompt)) {
                throw new Error(`Prompt at index ${index} is missing required field 'description'`);
            }
            if (typeof prompt.description !== 'string' || prompt.description.trim().length === 0) {
                throw new Error(`Prompt at index ${index} has invalid 'description' (must be a non-empty string)`);
            }

            // Check for required field: prompt
            if (!('prompt' in prompt)) {
                throw new Error(`Prompt at index ${index} is missing required field 'prompt'`);
            }
            if (typeof prompt.prompt !== 'string' || prompt.prompt.trim().length === 0) {
                throw new Error(`Prompt at index ${index} has invalid 'prompt' (must be a non-empty string)`);
            }

            // CRUCIAL: Check for [RAW_REQUEST] placeholder
            if (!prompt.prompt.includes('[RAW_REQUEST]')) {
                const promptName = prompt.name || `at index ${index}`;
                throw new Error(`Prompt '${promptName}' is missing [RAW_REQUEST] placeholder`);
            }
        }
    }

    /**
     * Builds a map of prompts by ID for quick lookup
     * @private
     * @returns {Object} Map of prompt ID to prompt data
     */
    _buildPromptsMap() {
        const map = {};
        for (const prompt of this.promptsData) {
            map[prompt.id] = prompt;
        }
        return map;
    }

    /**
     * Returns metadata for all available agents (without final prompts)
     * @returns {Array} Array of agent objects with id, name, description, promptTemplate
     */
    getAgents() {
        return this.promptsData.map(prompt => ({
            id: prompt.id,
            name: prompt.name,
            description: prompt.description,
            promptTemplate: prompt.prompt,
            finalPrompt: null,
            rawRequest: null
        }));
    }

    /**
     * Gets selection metadata for AI routing (minimal data for token efficiency)
     * @private
     * @returns {Array} Array of metadata objects with id, name, description
     */
    _getSelectionMetadata() {
        return this.promptsData.map(prompt => ({
            id: prompt.id,
            name: prompt.name,
            description: prompt.description
        }));
    }

    /**
     * Calls OpenAI API to select the best prompt ID for the user request
     * @private
     * @param {string} rawRequest - User's input/request
     * @returns {Promise<Object>} Object with id field
     */
    async _selectBestPrompt(rawRequest) {
        const systemInstruction = (
            "You are a routing system for an engineering analysis tool. " +
            "Your task is to map a RAW USER REQUEST to the most appropriate PROMPT ID " +
            "from the provided list based on the prompt's description.\n" +
            "Return ONLY a JSON object with the id field: {\"id\": <int>}"
        );

        const metadata = this._getSelectionMetadata();
        const userContent = `AVAILABLE PROMPTS:\n${JSON.stringify(metadata, null, 2)}\n\nRAW REQUEST: ${rawRequest}`;

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: userContent }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);
            return result;
        } catch (error) {
            console.error("Error during prompt selection:", error);
            // Default fallback to first prompt
            const firstPromptId = this.promptsData[0]?.id ?? 0;
            return { id: firstPromptId };
        }
    }

    /**
     * Constructs the final prompt by injecting user request into template
     * @private
     * @param {number|string} promptId - ID of the prompt template
     * @param {string} rawRequest - User's input to inject
     * @returns {string} Final prompt with [RAW_REQUEST] replaced
     */
    _constructFinalPrompt(promptId, rawRequest) {
        const promptData = this.prompts[promptId];
        if (!promptData) {
            throw new Error(`Invalid Prompt ID: ${promptId}`);
        }
        return promptData.prompt.replace("[RAW_REQUEST]", rawRequest);
    }

    /**
     * Main method: Routes a user request to the best prompt and returns the agent
     * @param {string} userRequest - The user's input/request
     * @returns {Promise<Object>} Agent object with id, name, description, promptTemplate, finalPrompt, rawRequest
     */
    async getAgent(userRequest) {
        // 1. Get metadata for routing
        const metadata = this._getSelectionMetadata();

        // 2. AI Router selects best ID
        const selection = await this._selectBestPrompt(userRequest);
        const selectedId = selection.id;

        // 3. Get prompt data
        const promptData = this.prompts[selectedId];
        if (!promptData) {
            throw new Error(`Prompt ID ${selectedId} not found`);
        }

        // 4. Construct final prompt with injection
        const finalPrompt = this._constructFinalPrompt(selectedId, userRequest);

        // 5. Return fully populated agent
        return {
            id: selectedId,
            name: promptData.name,
            description: promptData.description,
            promptTemplate: promptData.prompt,
            finalPrompt: finalPrompt,
            rawRequest: userRequest
        };
    }
}

// Export for module usage
export { PromptSwitcher };

// Usage example:
// 
// // Load prompts data (from file, API, or hardcoded)
// const prompts = [
//     { 
//         id: 1, 
//         name: "Test Prompt", 
//         description: "A test prompt",
//         prompt: "Do this: [RAW_REQUEST]" 
//     }
// ];
// 
// // Create switcher instance
// const switcher = new PromptSwitcher("sk-...", prompts);
// 
// // Use the switcher
// const agent = await switcher.getAgent("Fix my css");
// console.log(agent.finalPrompt);
// 
// // Or get all available agents:
// const agents = switcher.getAgents();
// console.log(agents);
