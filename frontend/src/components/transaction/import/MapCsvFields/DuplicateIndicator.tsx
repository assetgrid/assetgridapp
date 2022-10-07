import { faExclamationTriangle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import Tooltip from "../../../common/Tooltip";

interface Props {
    identifier: string
    duplicateIdentifiers: Set<string> | "fetching"
}

export default function DuplicateIndicator (props: Props): React.ReactElement {
    if (props.duplicateIdentifiers === "fetching") {
        return <Tooltip content="Checking for duplicates">
            <span className="icon">
                <FontAwesomeIcon icon={faSpinner} pulse />
            </span>
        </Tooltip>;
    }
    if (props.duplicateIdentifiers.has(props.identifier)) {
        return <Tooltip content="Duplicate identifier">
            <span className="icon has-text-warning">
                <FontAwesomeIcon icon={faExclamationTriangle} />
            </span>
        </Tooltip>;
    }
    return <></>;
}
