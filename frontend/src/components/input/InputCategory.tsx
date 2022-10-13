import * as React from "react";
import { Api } from "../../lib/ApiClient";
import InputAutoComplete from "./InputAutoComplete";

interface Props {
    label?: string
    value: string
    disabled: boolean
    onChange: (value: string) => void
    errors?: string[]
    isSmall?: boolean
}

export default function InputCategory (props: Props): React.ReactElement {
    return <InputAutoComplete
        allowNull={false}
        refreshSuggestions={refreshSuggestions} {...props} />;

    async function refreshSuggestions (api: Api, prefix: string): Promise<string[]> {
        const result = await api.Taxonomy.categoryAutocomplete(prefix);
        return result;
    }
}
