/**
 * @typedef {Object} PromptComponent
 * @property {string} type - The type of prompt component (e.g., 'text', 'instruction', 'context').
 * @property {string} content - The main content of the prompt component.
 * @property {Record<string, any>} [options] - Additional options for the component (e.g., importance, title, explanation).
 */
type PromptComponent = {
  type:
    | 'text'
    | 'instruction'
    | 'context'
    | 'rule'
    | 'example'
    | 'scenario'
    | 'note'
    | 'section';
  content: string;
  options?: Record<string, any>;
};

/**
 * Class for building structured prompts for LLMs (Large Language Models).
 */
class LLMPromptBuilder {
  private components: PromptComponent[];
  private globalContext: Record<string, any>;
  private userInputs: Record<string, any>;

  /**
   * Constructs a new LLMPromptBuilder instance.
   * @constructor
   */
  constructor() {
    this.components = [];
    this.globalContext = {};
    this.userInputs = {};
  }

  /**
   * Defines the global context for the prompt.
   * @param {Record<string, any>} context - A key-value pair representing the context.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  defineContext(context: Record<string, any>): LLMPromptBuilder {
    this.globalContext = { ...this.globalContext, ...context };
    return this;
  }

  /**
   * Adds plain text content to the prompt.
   * @param {string} content - The text content to add.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addText(content: string): LLMPromptBuilder {
    this.components.push({ type: 'text', content });
    return this;
  }

  /**
   * Adds a instructions to the prompt with an optional priority level.
   * @param {string} directive - The instruction to add.
   * @param {'high'|'medium'|'low'} [importance='medium'] - The priority level of the instruction.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addInstruction(
    instruction: string,
    importance?: 'high' | 'critical' | 'medium' | 'low'
  ): LLMPromptBuilder {
    const instructionExists = this.components.find(
      (comp) => comp.type === 'instruction'
    );
    if (instructionExists) {
      instructionExists.content += `\n- ${instruction}`;
      return this;
    }
    this.components.push({
      type: 'instruction',
      content: instruction,
      options: { importance },
    });
    return this;
  }

  /**
   * Adds background context to the prompt.
   * @param {string} context - The context information to add.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addContext(context: string): LLMPromptBuilder {
    this.components.push({ type: 'context', content: context });
    return this;
  }

  /**
   * Adds a rule or constraint to the prompt.
   * @param {string} rule - The rule or constraint to add.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addRule(rule: string): LLMPromptBuilder {
    const ruleExists = this.components.find((c) => c.type === 'rule');
    if (ruleExists) {
      ruleExists.content += `\n- ${rule}`;
      return this;
    }
    this.components.push({ type: 'rule', content: rule });
    return this;
  }

  /**
   * Adds an illustration (example) to the prompt with an optional explanation.
   * @param {string} illustration - The example text to add.
   * @param {string} [explanation] - An optional explanation for the example.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addExample(
    example: string,
    explanation?: string
  ): LLMPromptBuilder {
    this.components.push({
      type: 'example',
      content: example,
      options: { explanation },
    });
    return this;
  }

  /**
   * Adds a use case scenario to the prompt with an optional expected outcome.
   * @param {string} scenario - The scenario description to add.
   * @param {string} [expectedOutcome] - The optional expected outcome for the scenario.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addScenario(scenario: string, expectedOutcome?: string): LLMPromptBuilder {
    this.components.push({
      type: 'scenario',
      content: scenario,
      options: { expectedOutcome },
    });
    return this;
  }

  /**
   * Adds a special case with handling instructions to the prompt.
   * @param {string} specialCase - The special case description.
   * @param {string} handling - Instructions on how to handle the special case.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addNote(note: string): LLMPromptBuilder {
    this.components.push({
      type: 'note',
      content: note,
    });
    return this;
  }

  /**
   * Adds a markdown table to the prompt. This enables the LLM to provide structured data for better understanding and processing.
   * @param {string[]} headers - An array of table headers.
   * @param {string[][]} rows - An array of arrays, each representing a row of data.
   * @param {string} [label] - An optional label for the table.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  addSection(
    title: string,
    content: string
  ): LLMPromptBuilder {
    this.components.push({
      type: 'section',
      content,
      options: { title },
    });
    return this;
  }

  /**
   * Adds a custom block of content with a custom label to the prompt.
   * @param {string} label - A custom label for the content.
   * @param {string} content - The custom content.
   * @param {Record<string, any>} [options] - Additional options for the custom content.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */

  /**
   * Defines variables to be used in the prompt.
   * @param {Record<string, any>} vars - A key-value pair representing variables.
   * @returns {LLMPromptBuilder} The instance of the prompt builder for chaining.
   */
  setVariables(vars: Record<string, any>): LLMPromptBuilder {
    this.userInputs = { ...this.userInputs, ...vars };
    return this;
  }

  /**
   * Composes the final structured prompt for LLMs.
   * @returns {string} The fully composed prompt as a string.
   */
  compose(): string {
    let prompt = '';

    // Add global context if available
    if (Object.entries(this.globalContext).length > 0) {
      prompt += 'CONTEXT:\n';
      prompt += Object.entries(this.globalContext)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
      prompt += '\n\n';
    }

    // Add components
    prompt += this.components
      .map((component) => this.renderComponent(component))
      .join('\n\n');

    // Add user inputs if available
    if (Object.keys(this.userInputs).length > 0) {
      prompt += '\n\nINPUT DATA:\n';
      prompt += Object.entries(this.userInputs)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }

    return prompt.trim();
  }

  /**
   * Renders a single component into a string based on its type.
   * @private
   * @param {PromptComponent} component - The prompt component to render.
   * @returns {string} The rendered component as a string.
   */
  private renderComponent(component: PromptComponent): string {
    switch (component.type) {
      case 'text':
        return component.content;
      case 'instruction': {
        const importance = component.options?.importance;
        const prefix = importance ? `[${importance.toUpperCase()}] ` : '';
        return `${prefix}${component.content}`;
      }
      case 'context':
        return component.content.length > 0
          ? `Background: ${component.content}`
          : '';
      case 'rule':
        return `Rules:\n- ${component.content.split('\n').join('\n- ')}`;
      case 'example': {
        let text = `Example: ${component.content}`;
        if (component.options?.explanation) {
          text += `\n(${component.options.explanation})`;
        }
        return text;
      }
      case 'scenario': {
        let text = `Scenario: ${component.content}`;
        if (component.options?.expectedOutcome) {
          text += `\nExpected result: ${component.options.expectedOutcome}`;
        }
        return text;
      }
      case 'note':
        return `Note: ${component.content}`;
      case 'section': {
        const title = component.options?.title;
        return `## ${title}\n\n${component.content}`;
      }
      default:
        return '';
    }
  }
}

export const llmPromptBuilder = new LLMPromptBuilder();
export default llmPromptBuilder;
