import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../../lib/routes";
import { SearchGroupType, SearchOperator } from "../../../models/search";

interface Props {
    categories: string[]
}

export default function TransactionCategory (props: Props): React.ReactElement {
    const categories = [...new Set(props.categories.filter(category => category !== ""))];

    const query = {
        type: SearchGroupType.Query,
        query: {
            operator: props.categories.length === 0 ? SearchOperator.Equals : SearchOperator.In,
            not: false,
            column: "Category",
            value: props.categories.length === 0 ? "" : props.categories
        }
    };
    return <Link to={routes.transactions()}
        state={{ searchMode: "advanced", query }}>
        {categories.length > 0 ? categories[0] : ""}
        {categories.length > 1 && <>&hellip;</>}
    </Link>;
}
