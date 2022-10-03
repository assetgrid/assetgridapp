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
import { useApi } from "../../../lib/ApiClient";
import { CsvImportProfile } from "../../../models/csvImportProfile";

interface Props {
    csvParsed: (data: any[], lines: string[]) => void;
    fileChanged: (file: File) => void;
    optionsChanged: (options: CsvImportProfile) => void;
    options: CsvImportProfile;
    csvFile: File | null;
    goToNext: () => void;
}

const pageSize: number = 20;
const columnPageSize: number = 5;

export default function ImportCsv(props: Props) {
    const [csvData, setCsvData] = React.useState<Papa.ParseResult<any> | null | "error">(null);
    const [columnOffset, setColumnOffset] = React.useState(0);
    const [page, setPage] = React.useState(1);
    const [profileNames, setProfileNames] = React.useState<string[] | "fetching">("fetching");
    const [selectedProfile, setSelectedProfile] = React.useState<string | null>(null);
    const api = useApi();

    React.useEffect(() => {
        if (props.csvFile !== null) {
            reparseFile(props.csvFile);
        }
    }, [props.csvFile, props.options.csvParseHeader, props.options.csvNewlineCharacter, props.options.csvDelimiter])

    React.useEffect(() => {
        if (api !== null) {
            api.User.getCsvImportProfiles()
                .then(result => setProfileNames(result.data));
        }
    }, [api]);

    return <>
        <Card title="Profiles" isNarrow={true}>
            <p>Use an import profile that you have created earlier.</p>
            {profileNames === "fetching" && <p>
                Please wait while Assetgrid loads your profiles&hellip;
            </p>}
            {profileNames !== "fetching" && profileNames.length === 0 && <p>
                You do not have any import profiles. It will be possible to create an import profile at the end of the import process.
            </p>}
            {profileNames !== "fetching" && profileNames.length > 0 && <InputSelect
                isFullwidth={true}
                placeholder="Select profile"
                disabled={api === null}
                items={profileNames.map(x => ({ key: x, value: x }))}
                value={selectedProfile}
                onChange={updateSelectedProfile} />}
        </Card>

        <Card title="Import options" isNarrow={true}>
            <InputCheckbox label="Parse header"
                value={props.options.csvParseHeader}
                onChange={e => props.optionsChanged({ ...props.options, csvParseHeader: e.target.checked })} />
            <InputCheckbox label="Auto-detect delimiter"
                value={props.options.csvDelimiter == "auto"}
                onChange={e => e.target.checked == true
                    ? props.optionsChanged({ ...props.options, csvDelimiter: "auto" })
                    : props.optionsChanged({ ...props.options, csvDelimiter: "" })}
            />
            {props.options.csvDelimiter != "auto" &&
                <InputText label="Delimiter" value={props.options.csvDelimiter} onChange={e => props.optionsChanged({ ...props.options, csvDelimiter: e.target.value })} />}
            <InputSelect label="Newline character"
                value={props.options.csvNewlineCharacter}
                onChange={result => props.optionsChanged({ ...props.options, csvNewlineCharacter: result as "auto" | "\n" | "\r\n" | "\r" })}
                items={[
                    { key: "auto", value: "Detect automatically" },
                    { key: "\n", value: "\\n" },
                    { key: "\r", value: "\\r" },
                    { key: "\r\n", value: "\\r\\n" }
                ]} />
            <div className={"file mb-3 " + (props.csvFile != null ? " has-name" : "")}>
                <label className="file-label">
                    <input className="file-input" type="file" name="resume" onChange={e => fileUploaded(e)} />
                    <span className="file-cta">
                        <span className="file-icon">
                            <FontAwesomeIcon icon={faUpload} />
                        </span>
                        <span className="file-label">
                            Choose a file…
                        </span>
                    </span>
                    {props.csvFile != null && <span className="file-name">
                        {props.csvFile.name}
                    </span>}
                </label>
            </div>

            <p>If your bank exported a CSV file that is impossible to import due to missing features in the current importer, you can file an issue on our <a href="https://github.com/Assetgrid/assetgridapp/issues/new?assignees=&labels=CSV+issue&template=csv-file-cannot-be-imported.md&title=" target="_blank">Github page</a></p>
        </Card>

        {props.csvFile != null && <Card title="CSV data" isNarrow={false}>
            {renderCsvTable()}

            <div className="buttons">
                <InputButton className="is-primary" onClick={props.goToNext}>Continue</InputButton>
            </div>
        </Card>}
    </>;

    function renderCsvTable()
    {
        if (csvData == null) {
            return <p>Loading…</p>;
        }
        if (csvData == "error") {
            return <p>CSV file could not be parsed</p>;
        }
        if (csvData.data.length == 0) {
            return <p>No lines could be parsed</p>;
        }

        const columnCount = Object.keys(csvData.data[0]).length;
        const columns = Object.keys(csvData.data[0])
            .map((column, i) => { return { columnName: column, index: i } })
            .slice(columnOffset * columnPageSize, (columnOffset + 1) * columnPageSize);
        return <>
            <p>Displaying columns {(columnOffset) * columnPageSize + 1} to&nbsp;
                {Math.min((columnOffset + 1) * columnPageSize, columnCount)} of {columnCount}</p>
            <Table
                headings={<tr>
                    {columnOffset !== 0 && <th style={{ width: "1px" }}>
                        <InputIconButton icon={faChevronLeft} onClick={() => setColumnOffset(Math.max(0, columnOffset - 1))} />
                    </th>}
                    {columns.map((column, i) => <th key={i}>
                        {column.columnName}
                    </th>)}
                    {(columnOffset + 1) * columnPageSize < columnCount && <th style={{width: "1px"}}>
                        <InputIconButton icon={faChevronRight} onClick={() => setColumnOffset(columnOffset + 1)} />
                    </th>}
                </tr>}
                page={page}
                goToPage={setPage}
                pageSize={pageSize}
                items={csvData.data}
                type="sync"
                renderType="table"
                renderItem={(row, i) => <tr key={i}>
                    {columnOffset !== 0 && <td></td>}
                    {columns.map(column =>
                        <td key={column.index}>{(row as any)[column.columnName]}</td>
                    )}
                    {(columnOffset + 1) * columnPageSize < columnCount && <td></td>}
                </tr>}
            />
        </>;
    }
    
    function fileUploaded(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target?.files) return;

        let file = e.target.files[0];
        setColumnOffset(0);
        setPage(1);
        props.fileChanged(e.target.files[0]);
    }

    function reparseFile(file: File) {
        setCsvData(null);
        props.fileChanged(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) return;

            Papa.parse(event.target.result.toString(), {
                header: props.options.csvParseHeader,
                delimiter: props.options.csvDelimiter == "auto" ? undefined : props.options.csvDelimiter,
                newline: props.options.csvNewlineCharacter == "auto" ? undefined : props.options.csvNewlineCharacter,
                download: false,
                complete: (a) => {
                    props.csvParsed(a.data, event.target!.result!.toString().split(a.meta.linebreak));
                    setCsvData(a);
                }
            });
        };
        reader.onerror = (event) => {
            console.log(event);
            setCsvData("error");
        }
        reader.readAsText(file, "UTF-8");
    }

    async function updateSelectedProfile(name: string) {
        if (api === null) return;

        setSelectedProfile(name);
        const result = await api.User.getCsvImportProfile(name);
        if (result.status === 200) {
            props.optionsChanged(result.data);
        }
    }
}