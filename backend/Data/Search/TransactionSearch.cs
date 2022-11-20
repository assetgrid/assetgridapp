using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.Search;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.EntityFrameworkCore.Query.SqlExpressions;
using System.Data.Common;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection.Metadata;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml.Linq;

namespace assetgrid_backend.Data.Search
{
    public static class TransactionSearch
    {
        private static Dictionary<string, Type> columnTypes = new Dictionary<string, Type> {
            { "Id", typeof(int) },
            { "SourceAccount.Id", typeof(int?) },
            { "SourceAccount.Name", typeof(string) },
            { "DestinationAccount.Id", typeof(int?) },
            { "DestinationAccount.Name", typeof(string) },
            { "Description", typeof(string) },
            { "DateTime", typeof(DateTime) },
            { "Total", typeof(long) },
            { "Category", typeof(string) },
        };

        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, ViewSearch query, bool applyOrder, Dictionary<int, MetaField> metaFields)
        {
            var columns = new Dictionary<string, Func<SearchQuery, Expression, Expression>> {
                { "Id", (query, parameter) => Search.NumericExpression(query, typeof(int), false, Expression.Property(parameter, "Id")) },
                { "SourceAccountId", (query, parameter) => Search.NumericExpression(query, typeof(int?), true, Expression.Property(parameter, "SourceAccountId")) },
                { "DestinationAccountId", (query, parameter) => Search.NumericExpression(query, typeof(int?), true, Expression.Property(parameter, "DestinationAccountId")) },
                { "Description", (query, parameter) => Search.StringExpression(query, false, Expression.Property(parameter, "Description")) },
                { "DateTime", (query, parameter) => Search.NumericExpression(query, typeof(DateTime), false, Expression.Property(parameter, "DateTime")) },
                { "Total", (query, parameter) => Search.NumericExpression(query, typeof(long), true, Expression.Property(parameter, "Total")) },
                { "Category", (query, parameter) => TransactionLinesAny(parameter,
                    childParameter => Search.StringExpression(query, true, Expression.Property(childParameter, "Category"))) },
            };
            var parameter = Expression.Parameter(typeof(Transaction), "transaction");

            if (query.Query != null)
            {
                var expression = Search.SearchGroupToExpression<Transaction>(query.Query, columns, parameter, metaFields);
                if (expression != null)
                {
                    items = items.Where(Expression.Lambda<Func<Transaction, bool>>(expression, parameter));
                }
            }

            if (applyOrder && query.OrderByColumn != null)
            {
                // Construct expression to invoke OrderBy or OrderByDescending with the specified ordering
                var orderColumn = query.OrderByColumn;
                var orderColumnType = columnTypes[orderColumn];
                string command = (query.Descending ?? false) ? "OrderByDescending" : "OrderBy";
                Expression property = query.OrderByColumn switch
                {
                    "Category" => CategoryExpression(parameter),
                    "SourceAccount.Id" => Expression.Property(parameter, "SourceAccountId"),
                    "SourceAccount.Name" => Expression.Property(Expression.Property(parameter, "SourceAccount"), "Name"),
                    "DestinationAccount.Id" => Expression.Property(parameter, "DestinationAccountId"),
                    "DestinationAccount.Name" => Expression.Property(Expression.Property(parameter, "DestinationAccount"), "Name"),
                    _ => Expression.Property(parameter, orderColumn)
                };
                var orderByExpression = Expression.Lambda(property, parameter);
                var resultExpression = Expression.Call(typeof(Queryable), command, new Type[] { typeof(Transaction), orderColumnType },
                                              items.Expression, Expression.Quote(orderByExpression));
                items = items.Provider.CreateQuery<Transaction>(resultExpression);
            }

            return items;
        }

        /// <summary>
        /// Applies a search group but does not apply ordering
        /// </summary>
        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, SearchGroup? query, Dictionary<int, MetaField> metaFields)
        {
            if (query == null) return items;

            return items.ApplySearch(new ViewSearch
            {
                Descending = null,
                From = 0,
                To = 0,
                OrderByColumn = null,
                Query = query,
            }, false, metaFields);
        }

        /// <summary>
        /// Search transaction lines based on their parent transaction
        /// </summary>
        /// <param name="items"></param>
        /// <param name="query"></param>
        /// <returns></returns>
        public static IQueryable<TransactionLine> ApplySearch(this IQueryable<TransactionLine> items, SearchGroup? query, Dictionary<int, MetaField> metaData)
        {
            var columns = new Dictionary<string, Func<SearchQuery, Expression, Expression>> {
                { "Id", (query, parameter) => Search.NumericExpression(query, typeof(int), false, Expression.Property(parameter, "Id")) },
                { "SourceAccountId", (query, parameter) => Search.NumericExpression(query, typeof(int), true, Expression.Property(parameter, "SourceAccountId")) },
                { "DestinationAccountId", (query, parameter) => Search.NumericExpression(query, typeof(int), true, Expression.Property(parameter, "DestinationAccountId")) },
                { "Description", (query, parameter) => Search.StringExpression(query, false, Expression.Property(parameter, "Description")) },
                { "DateTime", (query, parameter) => Search.NumericExpression(query, typeof(DateTime), false, Expression.Property(parameter, "DateTime")) },
                { "Total", (query, parameter) => Search.NumericExpression(query, typeof(long), true, Expression.Property(parameter, "Total")) },
            };
            var parameter = Expression.Parameter(typeof(TransactionLine), "transaction");
            var parentTransactionExpression = Expression.Property(parameter, "Transaction")!;

            if (query != null)
            {
                var expression = Search.SearchGroupToExpression<Transaction>(query, columns, parentTransactionExpression, metaData);
                if (expression != null)
                {
                    items = items.Where(Expression.Lambda<Func<TransactionLine, bool>>(expression, parameter));
                }
            }

            return items;
        }

        #region Custom expression functions

        /// <summary>
        /// Generates a new expression that returns true if the child expression is true for any lines for this transaction
        /// </summary>
        public static Expression TransactionLinesAny(Expression transactionParameter, Func<Expression, Expression> childExpression)
        {
            var method = typeof(Enumerable)
                .GetMethods()
                .Single(method => method.Name == "Any" &&
                    method.GetParameters().Length == 2)
            .MakeGenericMethod(typeof(TransactionLine));

            var childParameter = Expression.Parameter(typeof(TransactionLine), "line");
            var childLambda = Expression.Lambda<Func<TransactionLine, bool>>(childExpression(childParameter), childParameter);

            var expression = Expression.Call(
                // Call method Any on the transaction's lines with the child lambda as the parameter
                null,
                method,
                Expression.Property(transactionParameter, "TransactionLines"),
                childLambda);

            return expression;
        }

        public static Expression CategoryExpression(Expression parameter)
        {
            var method = typeof(Enumerable)
                .GetMethods()
                .Single(method => method.Name == "First" &&
                    method.GetParameters().Length == 1)
            .MakeGenericMethod(typeof(TransactionLine));

            var firstLine = Expression.Call(
                // Call method Any on the transaction's lines with the child lambda as the parameter
                null,
                method,
                Expression.Property(parameter, "TransactionLines")
            );
            return Expression.Property(firstLine, "Category");
        }

        #endregion
    }
}
