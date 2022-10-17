using assetgrid_backend.Data.Search;
using assetgrid_backend.models.Automation;
using assetgrid_backend.Models;

namespace assetgrid_backend.Services
{
    public interface IAutomationService
    {
        void ApplyAutomationToTransaction(Transaction transaction, TransactionAutomation automation, User user);
    }

    public class AutomationService : IAutomationService
    {
        private readonly AssetgridDbContext _context;

        public AutomationService(AssetgridDbContext context)
        {
            _context = context;
        }

        public void ApplyAutomationToTransaction(Transaction transaction, TransactionAutomation automation, User user)
        {
            var transactionQuery = new List<Transaction> { transaction }.AsQueryable();
            if (transactionQuery.ApplySearch(automation.Query).Count() == 1)
            {
                automation.Actions.ForEach(action => action.Run(transaction, _context, user));
            }
        }
    }
}
