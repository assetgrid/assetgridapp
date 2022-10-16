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
            { "SourceAccountId", typeof(int?) },
            { "DestinationAccountId", typeof(int?) },
            { "Description", typeof(string) },
            { "DateTime", typeof(DateTime) },
            { "Total", typeof(long) },
        };

        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, ViewSearch query, bool applyOrder)
        {
            var columns = new Dictionary<string, Func<SearchQuery, Expression, Expression>> {
                { "Id", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int), false, Expression.Property(parameter, "Id")) },
                { "SourceAccountId", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int?), true, Expression.Property(parameter, "SourceAccountId")) },
                { "DestinationAccountId", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int?), true, Expression.Property(parameter, "DestinationAccountId")) },
                { "Description", (query, parameter) => DataExtensionMethods.StringExpression(query, false, Expression.Property(parameter, "Description")) },
                { "DateTime", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(DateTime), false, Expression.Property(parameter, "DateTime")) },
                { "Total", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(long), true, Expression.Property(parameter, "Total")) },
                { "Category", (query, parameter) => TransactionLinesAny(parameter,
                    childParameter => DataExtensionMethods.StringExpression(query, true, Expression.Property(childParameter, "Category"))) },
            };
            var parameter = Expression.Parameter(typeof(Transaction), "transaction");

            if (query.Query != null)
            {
                var expression = DataExtensionMethods.SearchGroupToExpression(query.Query, columns, parameter);
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
                var property = Expression.Property(parameter, orderColumn);
                if (query.OrderByColumn == "Category")
                {
                    property = Expression.Property(property, "Name");
                }
                if (query.OrderByColumn == "SourceAccountId" || query.OrderByColumn == "DestinationAccountId")
                {
                    property = Expression.Property(Expression.Property(parameter, query.OrderByColumn.Substring(0, query.OrderByColumn.Length - 2)), "Id");
                }
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
        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, SearchGroup? query)
        {
            if (query == null) return items;

            return items.ApplySearch(new ViewSearch
            {
                Descending = null,
                From = 0,
                To = 0,
                OrderByColumn = null,
                Query = query,
            }, false);
        }

        /// <summary>
        /// Search transaction lines based on their parent transaction
        /// </summary>
        /// <param name="items"></param>
        /// <param name="query"></param>
        /// <returns></returns>
        public static IQueryable<TransactionLine> ApplySearch(this IQueryable<TransactionLine> items, SearchGroup? query)
        {
            var columns = new Dictionary<string, Func<SearchQuery, Expression, Expression>> {
                { "Id", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int), false, Expression.Property(parameter, "Id")) },
                { "SourceAccountId", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int), true, Expression.Property(parameter, "SourceAccountId")) },
                { "DestinationAccountId", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int), true, Expression.Property(parameter, "DestinationAccountId")) },
                { "Description", (query, parameter) => DataExtensionMethods.StringExpression(query, false, Expression.Property(parameter, "Description")) },
                { "DateTime", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(DateTime), false, Expression.Property(parameter, "DateTime")) },
                { "Total", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(long), true, Expression.Property(parameter, "Total")) },
            };
            var parameter = Expression.Parameter(typeof(TransactionLine), "transaction");
            var parentTransactionExpression = Expression.Property(parameter, "Transaction")!;

            if (query != null)
            {
                var expression = DataExtensionMethods.SearchGroupToExpression(query, columns, parentTransactionExpression);
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

        #endregion
    }
}
