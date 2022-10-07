import * as React from "react";
import * as solid from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function YesNoDisplay (props: { value: boolean }): React.ReactElement {
    return <span className="icon">
        {props.value
            ? <FontAwesomeIcon icon={solid.faCheck} />
            : <FontAwesomeIcon icon={solid.faXmark} />}
    </span>;
}
