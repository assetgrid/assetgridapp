using assetgrid_backend.models.Automation;
using assetgrid_backend.models.Search;
using assetgrid_backend.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace assetgrid_backend.models.ViewModels.Automation
{
    public class ViewTransactionAutomation
    {
        public int Id { get; set; }
        public bool Enabled { get; set; }

        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters.")]
        public string Name { get; set; } = null!;

        [MaxLength(250, ErrorMessage = "Description must be shorter than 250 characters.")]
        public string Description { get; set; } = null!;
        public bool TriggerOnCreate { get; set; }
        public bool TriggerOnModify { get; set; }
        public SearchGroup Query { get; set; } = null!;
        public List<TransactionAutomationAction> Actions { get; set; } = null!;
        public UserTransactionAutomation.AutomationPermissions Permissions { get; set; }
    }

    public class ViewTransactionAutomationSummary
    {
        public int Id { get; set; }
        public bool Enabled { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public bool TriggerOnCreate { get; set; }
        public bool TriggerOnModify { get; set; }
        public UserTransactionAutomation.AutomationPermissions Permissions { get; set; }
    }
}
