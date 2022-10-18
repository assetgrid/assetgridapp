using assetgrid_backend.models.Search;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using System.Linq.Expressions;

namespace assetgrid_backend.Data.Search
{
    public static class AccountSearch
    {
        private static Dictionary<string, Type> columnTypes = new Dictionary<string, Type> {
            { "Id", typeof(int) },
            { "Name", typeof(string) },
            { "Description", typeof(string) },
        };

        public static IQueryable<UserAccount> ApplySearch(this IQueryable<UserAccount> items, ViewSearch query, bool applyOrder)
        {
            var columns = new Dictionary<string, Func<SearchQuery, Expression, Expression>> {
                { "Id", (query, parameter) => DataExtensionMethods.NumericExpression(query, typeof(int), false, Expression.Property(Expression.Property(parameter, "Account"), "Id")) },
                { "Name", (query, parameter) => DataExtensionMethods.StringExpression(query, false, Expression.Property(Expression.Property(parameter, "Account"), "Name")) },
                { "Description", (query, parameter) => DataExtensionMethods.StringExpression(query, false, Expression.Property(Expression.Property(parameter, "Account"), "Description")) },
                { "Favorite", (query, parameter) => DataExtensionMethods.BooleanExpression(query, Expression.Property(parameter, "Favorite")) },
                { "IncludeInNetWorth", (query, parameter) => DataExtensionMethods.BooleanExpression(query, Expression.Property(parameter, "IncludeInNetWorth")) },
            };
            var parameter = Expression.Parameter(typeof(UserAccount), "account");

            if (query.Query != null)
            {
                var expression = DataExtensionMethods.SearchGroupToExpression(query.Query, columns, parameter);
                if (expression != null)
                {
                    return items.Where(Expression.Lambda<Func<UserAccount, bool>>(expression, parameter));
                }
            }

            if (applyOrder && query.OrderByColumn != null)
            {
                // Construct expression to invoke OrderBy or OrderByDescending with the specified ordering
                var orderColumn = query.OrderByColumn;
                var orderColumnType = columnTypes[orderColumn];
                string command = (query.Descending ?? false) ? "OrderByDescending" : "OrderBy";
                var orderByExpression = Expression.Lambda(Expression.Property(Expression.Property(parameter, "Account"), orderColumn), parameter);
                var resultExpression = Expression.Call(typeof(Queryable), command, new Type[] { typeof(UserAccount), orderColumnType },
                                              items.Expression, Expression.Quote(orderByExpression));
                items = items.Provider.CreateQuery<UserAccount>(resultExpression);
            }

            return items;
        }
    }
}
