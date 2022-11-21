import { faUpload, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { useTranslation } from "react-i18next";

type Props = {
    filename: string | null
} & ({
    allowReset: true
    onChange: (file: File | null) => void
} | {
    allowReset: false
    onChange: (file: File) => void
});

export default function InputFile (props: Props): React.ReactElement {
    const { t } = useTranslation();

    return <div className={"file mb-3 has-addons" + (props.filename !== null ? " has-name" : "")}>
        <label className="file-label">
            <input className="file-input" type="file" name="resume" onChange={fileChanged} />
            <span className="file-cta">
                <span className="file-icon">
                    <FontAwesomeIcon icon={faUpload} />
                </span>
                <span className="file-label">
                    {t("common.chose_a_file")!}
                </span>
            </span>
            {props.filename != null && <span className="file-name">
                {props.filename}
            </span>}
            { props.allowReset && props.filename !== null && <p className="control">
                <a className="button" onClick={clearSelection}>
                    <FontAwesomeIcon icon={faXmark} />
                </a>
            </p>}
        </label>
    </div>;

    function fileChanged (e: React.ChangeEvent<HTMLInputElement>): void {
        if ((e.target?.files) == null) return;
        if (e.target.files.length === 0) return;
        props.onChange(e.target.files[0]);
    }

    function clearSelection (e: React.MouseEvent<HTMLAnchorElement>): void {
        if (!props.allowReset) return;
        props.onChange(null);
        e.preventDefault();
    }
}
