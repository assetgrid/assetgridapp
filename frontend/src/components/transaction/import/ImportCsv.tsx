import * as Papa from "papaparse";
import * as React from "react";
import Card from "../../common/Card";
import Table from "../../common/Table";
import InputButton from "../../input/InputButton";
import InputCheckbox from "../../input/InputCheckbox";
import InputSelect from "../../input/InputSelect";
import InputText from "../../input/InputText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import InputIconButton from "../../input/InputIconButton";
import { Api, useApi } from "../../../lib/ApiClient";
import { CsvImportProfile } from "../../../models/csvImportProfile";
import InputAutoComplete from "../../input/InputAutoComplete";
import * as jschardet from "jschardet";
import { forget } from "../../../lib/Utils";
import InputNumber from "../../input/InputNumber";
import Decimal from "decimal.js";
import { Trans, useTranslation } from "react-i18next";

const encodings = ["Big5", "GB2312", " GB18030", "EUC-TW", "HZ-GB-2312", "ISO-2022-CN", "EUC-JP", "SHIFT_JIS", "ISO-2022-JP", "EUC-KR", "ISO-2022-KR", "KOI8-R", "MacCyrillic",
    "IBM855", "IBM866", "ISO-8859-5", "ISO-8859-2", "windows-1250", "ISO-8859-5", "windows-1251", "windows-1252", "ISO-8859-7", "windows-1253", "ISO-8859-8",
    "windows-1255", "TIS-620", "UTF-32", "UTF-16", "UTF-8", "ASCII"];

interface Props {
    csvParsed: (data: any[], lines: string[]) => void
    fileChanged: (file: File) => void
    optionsChanged: (options: CsvImportProfile) => void
    options: CsvImportProfile
    csvFile: File | null
    goToNext: () => void
}

const pageSize: number = 20;
const columnPageSize: number = 5;

export default function ImportCsv (props: Props): React.ReactElement {
    const [csvData, setCsvData] = React.useState<Papa.ParseResult<any> | null | "error">(null);
    const [columnOffset, setColumnOffset] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [profileNames, setProfileNames] = React.useState<string[] | "fetching">("fetching");
    const [selectedProfile, setSelectedProfile] = React.useState<string | null>(null);
    const [encoding, setEncoding] = React.useState<string | null>(props.options.csvTextEncoding);
    const api = useApi();
    const { t } = useTranslation();

    React.useEffect(() => {
        if (props.csvFile !== null) {
            reparseFile(props.csvFile);
        }
    }, [props.csvFile, props.options.csvParseHeader, props.options.csvNewlineCharacter,
        props.options.csvDelimiter, props.options.csvTextEncoding, props.options.csvSkipLines]);

    React.useEffect(() => {
        setEncoding(props.options.csvTextEncoding);
    }, [props.options.csvTextEncoding]);

    React.useEffect(() => {
        if (api !== null) {
            api.User.getCsvImportProfiles()
                .then(result => setProfileNames(result.data))
                .catch(null);
        }
    }, [api]);

    return <>
        <Card title={t("import.profiles")!} isNarrow={true}>
            <p>{t("import.use_import_profile_created_earlier")}</p>
            {profileNames === "fetching" && <p>
                {t("import.please_wait_loading_import_profiles")}
            </p>}
            {profileNames !== "fetching" && profileNames.length === 0 && <p>
                {t("import.no_profiles_can_create_after_import")}
            </p>}
            {profileNames !== "fetching" && profileNames.length > 0 && <InputSelect
                isFullwidth={true}
                placeholder={t("import.select_import_profile")!}
                disabled={api === null}
                items={profileNames.map(x => ({ key: x, value: x }))}
                value={selectedProfile}
                onChange={forget(updateSelectedProfile)} />}
        </Card>

        <Card title={t("import.import_options")!} isNarrow={true}>
            <InputCheckbox label={t("import.parse_csv_header")!}
                value={props.options.csvParseHeader}
                onChange={e => props.optionsChanged({ ...props.options, csvParseHeader: e.target.checked })} />

            <InputCheckbox label={t("import.auto_detect_csv_delimiter")!}
                value={props.options.csvDelimiter === "auto"}
                onChange={e => e.target.checked
                    ? props.optionsChanged({ ...props.options, csvDelimiter: "auto" })
                    : props.optionsChanged({ ...props.options, csvDelimiter: "" })}
            />

            {props.options.csvDelimiter !== "auto" &&
                <InputText label={t("import.csv_delimiter")!}
                    value={props.options.csvDelimiter}
                    onChange={e => props.optionsChanged({ ...props.options, csvDelimiter: e.target.value })} />}

            <InputSelect label={t("import.csv_newline_character")!}
                value={props.options.csvNewlineCharacter}
                onChange={result => props.optionsChanged({ ...props.options, csvNewlineCharacter: result })}
                items={[
                    { key: "auto", value: t("common.detect_automatically") },
                    { key: "\n", value: "\\n" },
                    { key: "\r", value: "\\r" },
                    { key: "\r\n", value: "\\r\\n" }
                ]} />

            <InputCheckbox label={t("import.auto_detect_text_encoding")!}
                value={props.options.csvTextEncoding == null}
                helpText={props.options.csvTextEncoding === null && encoding !== null ? t("import.encoding_auto_detected_as_value", { encoding })! : ""}
                onChange={e => e.target.checked
                    ? props.optionsChanged({ ...props.options, csvTextEncoding: null })
                    : props.optionsChanged({ ...props.options, csvTextEncoding: "" })}
            />

            {props.options.csvTextEncoding !== null && <InputAutoComplete
                value={props.options.csvTextEncoding}
                label={t("import.file_text_encoding")!}
                disabled={false}
                fullwidth={false}
                allowNull={false}
                onChange={value => props.optionsChanged({ ...props.options, csvTextEncoding: value })}
                refreshSuggestions={async (api: Api, prefix: string) => await new Promise<string[]>(
                    resolve => resolve(encodings.sort((a, b) => a.localeCompare(b)).filter(x => x.toLocaleLowerCase().includes(prefix.toLocaleLowerCase())))
                )} />}

            <InputNumber label={t("import.skip_first_lines")!}
                value={new Decimal(props.options.csvSkipLines)}
                allowNull={false}
                onChange={value => props.optionsChanged({ ...props.options, csvSkipLines: value.toNumber() })} />

            <div className={"file mb-3 " + (props.csvFile != null ? " has-name" : "")}>
                <label className="file-label">
                    <input className="file-input" type="file" name="resume" onChange={e => fileUploaded(e)} />
                    <span className="file-cta">
                        <span className="file-icon">
                            <FontAwesomeIcon icon={faUpload} />
                        </span>
                        <span className="file-label">
                            {t("common.chose_a_file")!}
                        </span>
                    </span>
                    {props.csvFile != null && <span className="file-name">
                        {props.csvFile.name}
                    </span>}
                </label>
            </div>

            <p>
                <Trans i18nKey="import.impossible_csv_github_link">
                    If your bank exported a CSV file that is impossible to import due to missing features in the current importer, you can file an issue on our <a href="https://github.com/Assetgrid/assetgridapp/issues/new?assignees=&labels=CSV+issue&template=csv-file-cannot-be-imported.md&title=" target="_blank" rel="noreferrer">Github page</a>
                </Trans>
            </p>
        </Card>

        {props.csvFile != null && <Card title={t("import.csv_data_preview")!} isNarrow={false}>
            {renderCsvTable()}

            <div className="buttons">
                <InputButton className="is-primary" onClick={props.goToNext}>{t("common.continue")}</InputButton>
            </div>
        </Card>}
    </>;

    function renderCsvTable (): React.ReactElement {
        if (csvData == null) {
            return <p>{t("common.please_wait")}</p>;
        }
        if (csvData === "error") {
            return <p>{t("import.csv_could_not_be_parsed")}</p>;
        }
        if (csvData.data.length === 0) {
            return <p>{t("import.csv_no_lines_parsed")}</p>;
        }

        const columnCount = Object.keys(csvData.data[0]).length;
        const columns = Object.keys(csvData.data[0])
            .map((column, i) => { return { columnName: column, index: i }; })
            .slice(columnOffset * columnPageSize, (columnOffset + 1) * columnPageSize);
        return <>
            <p>
                {t("import.displaying_columns_from_to", {
                    from: (columnOffset) * columnPageSize + 1,
                    to: Math.min((columnOffset + 1) * columnPageSize, columnCount),
                    total: columnCount
                })}
            </p>
            <Table
                headings={<tr>
                    {columnOffset !== 0 && <th style={{ width: "1px" }}>
                        <InputIconButton icon={faChevronLeft} onClick={() => setColumnOffset(Math.max(0, columnOffset - 1))} />
                    </th>}
                    {columns.map((column, i) => <th key={i}>
                        {column.columnName}
                    </th>)}
                    {(columnOffset + 1) * columnPageSize < columnCount && <th style={{ width: "1px" }}>
                        <InputIconButton icon={faChevronRight} onClick={() => setColumnOffset(columnOffset + 1)} />
                    </th>}
                </tr>}
                page={page}
                goToPage={setPage}
                pageSize={pageSize}
                items={csvData.data}
                renderItem={(row, i) => <tr key={i}>
                    {columnOffset !== 0 && <td></td>}
                    {columns.map(column =>
                        <td key={column.index}>{(row)[column.columnName]}</td>
                    )}
                    {(columnOffset + 1) * columnPageSize < columnCount && <td></td>}
                </tr>}
            />
        </>;
    }

    function fileUploaded (e: React.ChangeEvent<HTMLInputElement>): void {
        if ((e.target?.files) == null) return;

        const file = e.target.files[0];
        setColumnOffset(0);
        setPage(1);
        props.fileChanged(file);
    }

    function reparseFile (file: File): void {
        props.fileChanged(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target === null || event.target.result === null || typeof event.target.result !== "string") return;

            let encoding = props.options.csvTextEncoding ?? "";
            if (encoding.trim() === "") {
                encoding = jschardet.detect(event.target.result).encoding;
            }
            setEncoding(encoding);

            const decoder = new TextDecoder(encoding);
            let decodedString = decoder.decode(Uint8Array.from(event.target.result, x => x.charCodeAt(0)));

            if (props.options.csvSkipLines > 0) {
                const lineEndings = props.options.csvNewlineCharacter === "auto" ? guessLineEndings(decodedString, "\"") : props.options.csvNewlineCharacter;
                let startIndex = 0;
                for (let i = 0; i < props.options.csvSkipLines; i++) {
                    startIndex = decodedString.indexOf(lineEndings, startIndex + lineEndings.length);
                }
                decodedString = decodedString.substring(startIndex + lineEndings.length);
            }

            Papa.parse(decodedString, {
                header: props.options.csvParseHeader,
                delimiter: props.options.csvDelimiter === "auto" ? undefined : props.options.csvDelimiter,
                newline: props.options.csvNewlineCharacter === "auto" ? undefined : props.options.csvNewlineCharacter,
                download: false,
                complete: (a) => {
                    props.csvParsed(a.data, ((event?.target?.result ?? "") as string).split(a.meta.linebreak));
                    setCsvData(a);
                }
            });
        };
        reader.onerror = (event) => {
            console.log(event);
            setCsvData("error");
        };
        reader.readAsBinaryString(file);
    }

    async function updateSelectedProfile (name: string): Promise<void> {
        if (api === null) return;

        setSelectedProfile(name);
        const result = await api.User.getCsvImportProfile(name);
        if (result.status === 200) {
            props.optionsChanged(result.data);
        }
    }

    function guessLineEndings (input: string, quoteChar: string): "\n" | "\r" | "\r\n" {
        input = input.substring(0, 1024 * 1024); // max length 1 MB
        // Replace all the text inside quotes
        const re = new RegExp(escapeRegExp(quoteChar) + "([^]*?)" + escapeRegExp(quoteChar), "gm");
        input = input.replace(re, "");

        const r = input.split("\r");

        const n = input.split("\n");

        const nAppearsFirst = (n.length > 1 && n[0].length < r[0].length);

        if (r.length === 1 || nAppearsFirst) {
            return "\n";
        }

        let numWithN = 0;
        for (let i = 0; i < r.length; i++) {
            if (r[i][0] === "\n") {
                numWithN++;
            }
        }

        return numWithN >= r.length / 2 ? "\r\n" : "\r";

        function escapeRegExp (string: string): string {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
        }
    }
}
