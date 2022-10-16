using assetgrid_backend.Models;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models.ViewModels
{
    public class ViewCsvImportProfile
    {
        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters")]
        public string Name { get; set; } = null!;
        public CsvImportProfile Profile { get; set; } = null!;
    }
}
