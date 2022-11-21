using assetgrid_backend.Data.Search;
using assetgrid_backend.models.Automation;
using assetgrid_backend.Models;

namespace assetgrid_backend.Services
{
    public interface IAutomationService
    {
        Task ApplyAutomationToTransaction(Transaction transaction, TransactionAutomation automation, User user);
    }

    public class AutomationService : IAutomationService
    {
        private readonly AssetgridDbContext _context;
        private readonly IMetaService _meta;

        public AutomationService(AssetgridDbContext context, IMetaService meta)
        {
            _context = context;
            _meta = meta;
        }

        public async Task ApplyAutomationToTransaction(Transaction transaction, TransactionAutomation automation, User user)
        {
            #warning This function will not work with metadata
            var metaFields = await _meta.GetFields(user.Id);
            var transactionQuery = new List<Transaction> { transaction }.AsQueryable();
            if (transactionQuery.ApplySearch(automation.Query, metaFields).Count() == 1)
            {
                automation.Actions.ForEach(action => action.Run(transaction, _context, user));
            }
        }
    }
}
