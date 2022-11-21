import { faExclamationTriangle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Tooltip from "../../../common/Tooltip";

interface Props {
    identifier: string
    duplicateIdentifiers: Set<string> | "fetching"
}

export default function DuplicateIndicator (props: Props): React.ReactElement {
    const { t } = useTranslation();
    if (props.duplicateIdentifiers === "fetching") {
        return <Tooltip content={t("import.checking_for_duplicates")}>
            <span className="icon">
                <FontAwesomeIcon icon={faSpinner} pulse />
            </span>
        </Tooltip>;
    }
    if (props.duplicateIdentifiers.has(props.identifier)) {
        return <Tooltip content={t("import.duplicate_identifier")}>
            <span className="icon has-text-warning">
                <FontAwesomeIcon icon={faExclamationTriangle} />
            </span>
        </Tooltip>;
    }
    return <></>;
}
