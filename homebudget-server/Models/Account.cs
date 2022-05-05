using homebudget_server.Models.ViewModels;

namespace homebudget_server.Models
{
    public class Account
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }

        public ViewAccount ToView()
        {
            return new ViewAccount
            {
                Description = Description,
                Id = Id,
                Name = Name
            };
        }
    }
}
