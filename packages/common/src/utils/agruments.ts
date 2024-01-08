const regex = /(?:--|-)(?<name>\S+)=(?<value>\S+)/;

export const argumetsParser = (argumentsArray: string[]) => {
    const args: { [key: string]: any } = {};

    for (let i = 0; i < argumentsArray.length; i++) {
        const arg = argumentsArray[i];

        if (!regex.test(arg)) continue;
        const { name, value }: any = regex.exec(arg)?.groups!;

        if (isFinite(value)) args[name] = parseFloat(value);
        else if (value == 'true') args[name] = true;
        else if (value == 'false') args[name] = false;
        else args[name] = value;
    }

    return args;
};
