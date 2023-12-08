import { init, ExpressionParser } from 'expressionparser'
import { ExpressionValue } from 'expressionparser/dist/ExpressionParser'
import { arithmeticLanguage } from './simpleLanguage';

export class Language {

    private modules: Record<string, AbstractModule> = {};

    private expressionParser: ExpressionParser;

    constructor() {
        // @ts-ignore
        this.expressionParser = init(arithmeticLanguage)
    }

    public registerModule(module: AbstractModule) {
        if (module.constructor.name in this.modules) {
            throw new Error(`Module with name ${module.constructor.name} already registered in modules list`)
        }

        this.modules[module.constructor.name] = module;
    }

    public updateModules() {
        for (const module of Object.values(this.modules)) {
            module.update()
        }
    }

    public getModule(moduleName: string): AbstractModule | undefined {
        if (!(moduleName in this.modules)) {
            return undefined;
        }

        return this.modules[moduleName];
    }

    public expressionToValue(expression: string): ExpressionValue {
        return this.expressionParser.expressionToValue(expression);
    }

    // [Module::property + 0x28] = ptr(modules['Module']['property'] + 0x28)
}

interface IProperty {
    expression: string;
    value: number | string;
    initialValue: number | string;
}

interface IPropertyDescription {
    [propertyName: string]: Pick<IProperty, "expression" | "initialValue">;
}

class AbstractModule {

    private language: Language;

    private properties: Record<string, IProperty> = {}

    constructor(lang: Language, propertyDescription: IPropertyDescription) {
        for (const propertyName in propertyDescription) {
            if (propertyName in this.properties) {
                throw new Error("Property name already registered!")
            }

            this.properties[propertyName] = {
                ...propertyDescription[propertyName],
                value: propertyDescription[propertyName].initialValue
            }
        }

        this.language = lang;
    }

    public resetValues() {
        for (const propertyName in this.properties) {
            this.properties[propertyName] = {
                ...this.properties[propertyName],
                value: this.properties[propertyName].initialValue
            }
        }
    }

    public update() {
        for (const propertyName in this.properties) {
            const newVal = this.language.expressionToValue(this.properties[propertyName].expression).valueOf();
            if (typeof newVal !== "string" || typeof newVal !== "number") {
                throw new Error("Expression returned wrong primitive")
            }

            this.properties[propertyName].value = newVal;
        }
    }
}