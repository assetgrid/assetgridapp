import axios from "axios";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown, faCross, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Api, useApi } from "../../lib/ApiClient";
import { debounce } from "../../lib/Utils";
import InputAutocomplete from "./InputAutocomplete";

interface Props {
    label?: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
    errors?: string[];
}

export default function InputCategory (props: Props) {
    return <InputAutocomplete refreshSuggestions={refreshSuggestions} {...props} />;

    function refreshSuggestions(api: Api, prefix: string): Promise<string[]> {
        return new Promise<string[]>(resolve => {
            api.Taxonomy.categoryAutocomplete(prefix).then(result => {
                resolve(result);
            });
        });
    }
}