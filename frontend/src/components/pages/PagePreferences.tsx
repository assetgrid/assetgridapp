import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { getUser, useApi } from "../../lib/ApiClient";
import { formatDateTimeWithPreferences, formatDateWithPreferences, formatNumberWithPreferences } from "../../lib/Utils";
import { HttpErrorResult } from "../../models/api";
import { Preferences } from "../../models/preferences";
import { User } from "../../models/user";
import Card from "../common/Card";
import Hero from "../common/Hero";
import InputButton from "../input/InputButton";
import InputNumber from "../input/InputNumber";
import InputText from "../input/InputText";
import InputTextOrNull from "../input/InputTextOrNull";

export default function PagePreferences (): React.ReactElement {
    const { t } = useTranslation();

    const api = useApi();
    const queryClient = useQueryClient();
    const { data: user } = useQuery({
        queryKey: ["user"],
        queryFn: getUser,
        keepPreviousData: true,
        onSuccess: user => { setModel(user.preferences); }
    });
    const [model, setModel] = React.useState<Preferences | "fetching">(user === undefined ? "fetching" : user.preferences);
    const { mutate, error, isLoading: isUpdating } = useMutation<Preferences, HttpErrorResult, Preferences, unknown>({
        mutationFn: api.User.updatePreferences,
        onSuccess: result => { queryClient.setQueryData<User>(["user"], old => ({ ...old!, preferences: result })); }
    });
    const errors = error?.status === 400 ? error.errors : {};
    const exampleDateTime = React.useMemo(() => DateTime.fromJSDate(new Date()), []);

    return <>
        <Hero title={t("common.preferences")} subtitle={t("common.modify_preferences")} />
        <div className="t-3">
            {renderContent()}
        </div>
    </>;

    function renderContent (): React.ReactElement {
        if (model === "fetching") {
            // This will only be shown until the global preferences are loaded.
            // Then the model will be set and will never be "fetching again"
            return <Card title={t("preferences.number_and_date_formatting")!} isNarrow={true}>
                {t("common.please_wait")}
            </Card>;
        }

        return <Card title={t("preferences.number_and_date_formatting")!} isNarrow={true}>
            <div className="columns mb-0">
                <div className="column">
                    <InputText value={model.decimalSeparator}
                        disabled={isUpdating}
                        label={t("preferences.decimal_separator")!}
                        errors={errors.DecimalSeparator}
                        onChange={(event => setModel({
                            ...model,
                            decimalSeparator: event.target.value
                        }))} />
                </div>
                <div className="column">
                    <InputText value={model.thousandsSeparator}
                        disabled={isUpdating}
                        label={t("preferences.thousands_separator")!}
                        errors={errors.ThousandsSeparator}
                        onChange={(event => setModel({
                            ...model,
                            thousandsSeparator: event.target.value
                        }))} />
                </div>
                <div className="column">
                    <InputNumber value={new Decimal(model.decimalDigits)}
                        disabled={isUpdating}
                        errors={errors.DecimalDigits}
                        label={t("preferences.digits_after_decimal_point")!}
                        allowNull={false}
                        onChange={(value => setModel({
                            ...model,
                            decimalDigits: Math.max(0, Math.min(value.round().toNumber(), 4))
                        }))} />
                </div>
            </div>

            <p className="pb-3 pt-1">
                {t("common.example", { example: formatNumberWithPreferences(new Decimal("123456789.123456789"), model) })}
            </p>

            <div className="columns pt-3">
                <div className="column">
                    <InputTextOrNull value={model.dateFormat}
                        disabled={isUpdating}
                        noValueText={t("preferences.system_default")!}
                        errors={errors.DateFormat}
                        label={t("preferences.date_format")!}
                        onChange={(value => setModel({
                            ...model,
                            dateFormat: value
                        }))} />
                    <p>{t("common.example", { example: formatDateWithPreferences(exampleDateTime, model) })}</p>
                </div>
                <div className="column">
                    <InputTextOrNull value={model.dateTimeFormat}
                        disabled={isUpdating}
                        label={t("preferences.date_and_time_format")!}
                        errors={errors.DateTimeFormat}
                        noValueText={t("preferences.system_default")!}
                        onChange={(value => setModel({
                            ...model,
                            dateTimeFormat: value
                        }))} />
                    <p>{t("common.example", { example: formatDateTimeWithPreferences(exampleDateTime, model) })}</p>
                </div>
            </div>
            <a href="https://moment.github.io/luxon/#/formatting?id=table-of-tokens" target="_blank" rel="noreferrer">
                {t("preferences.more_information_on_date_formats")}
            </a>

            <div className="buttons mt-5">
                <InputButton
                    disabled={isUpdating || api === null}
                    className="is-primary"
                    onClick={() => mutate(model)}>
                    {t("common.save_changes")}
                </InputButton>
            </div>
        </Card>;
    }
}
