import { faAngleDoubleLeft, faAngleLeft, faAngleDoubleRight, faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface Props {
    page: number
    totalItems: number
    pageSize: number
    paginationSize: number
    reversePagination: boolean
    incrementPeriod?: () => void
    decrementPeriod?: () => void
    goToPage: (page: number) => void
}

export function Pagination (props: Props): React.ReactElement {
    const { t } = useTranslation();

    const page = props.page;
    const lastPage = Math.max(1, Math.ceil(props.totalItems / props.pageSize));
    const pagesBesideCurrent = ((props.paginationSize ?? 9) - 3) / 2;
    let paginationFrom = Math.max(2, page - pagesBesideCurrent);
    const paginationTo = Math.min(paginationFrom + 1 + pagesBesideCurrent * 2, lastPage);
    if (paginationTo - paginationFrom < pagesBesideCurrent * 2 + 1) {
        paginationFrom = Math.max(2, paginationTo - pagesBesideCurrent * 2 - 1);
    }
    const reverse = props.reversePagination ?? false;

    if (reverse) {
        // Reverse pagination
        return <div className="pagination-container">
            <p className="pagination-position">
                {t("pagination.displaying_from_to", {
                    from: Math.min(props.pageSize * (page - 1) + 1, props.totalItems),
                    to: Math.min(props.pageSize * (page), props.totalItems),
                    total: props.totalItems
                })}
            </p>

            <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginBottom: 0 }}>
                <ul className="pagination-list">
                    <li>
                        {page === lastPage && props.decrementPeriod !== undefined
                            ? <a className="pagination-link"
                                aria-label={t("pagination.previous_page")!}
                                onClick={() => { props.decrementPeriod!(); }}>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleDoubleLeft} />
                                </span>
                            </a>
                            : <a className="pagination-link"
                                aria-label={t("pagination.previous_page")!}
                                onClick={() => goToPage(page + 1)}>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleLeft} />
                                </span>
                            </a>}
                    </li>
                    {lastPage !== 1 && <li>
                        <a className={`pagination-link ${page === lastPage ? " is-current" : ""}`}
                            aria-label={t("pagination.go_to_page", { page: lastPage })!}
                            onClick={() => goToPage(lastPage)}>{lastPage}</a>
                    </li>}
                    {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                        .map(page => paginationTo - page - 1)
                        .map(p =>
                            (p === paginationFrom && p > 2) ||
                                (p === paginationTo - 1 && p < lastPage - 1)
                                ? <li key={p}><span className="pagination-ellipsis">&hellip;</span></li>
                                : <li key={p}><a className={"pagination-link" + (page === p ? " is-current" : "")}
                                    onClick={() => goToPage(p)} aria-label={t("pagination.go_to_page", { page: p })!}>{p}</a></li>
                        )}
                    <li>
                        <a className={`pagination-link ${page === 1 ? " is-current" : ""}`}
                            aria-label={t("pagination.go_to_page", { page: 1 })!} onClick={() => goToPage(1)}>1</a>
                    </li>
                    <li>
                        {page === 1 && props.incrementPeriod !== undefined
                            ? <a className="pagination-link" aria-label={t("pagination.next_page")!}
                                onClick={() => { props.incrementPeriod!(); }}>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleDoubleRight} />
                                </span>
                            </a>
                            : <a className="pagination-link" aria-label={t("pagination.next_page")!}
                                onClick={() => goToPage(page - 1)}>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleRight} />
                                </span>
                            </a>}
                    </li>
                </ul>
            </nav>
        </div>;
    } else {
        // Ordinary pagination
        return <div className="pagination-container">
            <p className="pagination-position">
                {t("pagination.displaying_from_to", {
                    from: Math.min(props.pageSize * (page - 1) + 1, props.totalItems),
                    to: Math.min(props.pageSize * (page), props.totalItems),
                    total: props.totalItems
                })}
            </p>

            <nav className="pagination is-centered" role="navigation" aria-label="pagination" style={{ marginBottom: 0 }}>
                <ul className="pagination-list">
                    <li>
                        {page === 1 && props.decrementPeriod !== undefined
                            ? <a className="pagination-link"
                                aria-label={t("pagination.previous_page")!}
                                onClick={() => props.decrementPeriod!() }>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleDoubleLeft} />
                                </span>
                            </a>
                            : <a className="pagination-link"
                                aria-label={t("pagination.previous_page")!}
                                onClick={() => goToPage(page - 1)}>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleLeft} />
                                </span>
                            </a>}
                    </li>
                    <li>
                        <a className={"pagination-link" + (page === 1 ? " is-current" : "")}
                            aria-label={t("pagination.go_to_page", { page: 1 })!} onClick={() => goToPage(1)}>1</a>
                    </li>
                    {paginationTo > paginationFrom && Array.from(Array(paginationTo - paginationFrom).keys())
                        .map(page => page + paginationFrom)
                        .map(p =>
                            (p === paginationFrom && p > 2) ||
                                (p === paginationTo - 1 && p < lastPage - 1)
                                ? <li key={p}><span className="pagination-ellipsis">&hellip;</span></li>
                                : <li key={p}><a className={"pagination-link" + (page === p ? " is-current" : "")}
                                    onClick={() => goToPage(p)} aria-label={t("pagination.go_to_page", { page: p })!}>{p}</a></li>
                        )}
                    {lastPage !== 1 && <li>
                        <a className={"pagination-link" + (page === lastPage ? " is-current" : "")}
                            aria-label={t("pagination.go_to_page", { page: lastPage })!} onClick={() => goToPage(lastPage)}>{lastPage}</a>
                    </li>}
                    <li>
                        {page === lastPage && props.incrementPeriod !== undefined
                            ? <a className="pagination-link"
                                aria-label={t("pagination.next_page")!}
                                onClick={() => props.incrementPeriod!() }>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleDoubleRight} />
                                </span>
                            </a>
                            : <a className="pagination-link"
                                aria-label={t("pagination.next_page")!}
                                onClick={() => goToPage(page + 1)}>
                                <span className="icon">
                                    <FontAwesomeIcon icon={faAngleRight} />
                                </span>
                            </a>}
                    </li>
                </ul>
            </nav>
        </div>;
    }

    function goToPage (page: number): void {
        if (page < 1) page = 1;
        if ((page - 1) * props.pageSize > props.totalItems) page = Math.floor(props.totalItems / props.pageSize) + 1;

        props.goToPage(page);
    }
}
