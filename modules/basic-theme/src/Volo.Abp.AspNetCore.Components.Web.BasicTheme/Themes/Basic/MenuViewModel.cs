using System;
using System.Collections.Generic;
using Volo.Abp.UI.Navigation;

namespace Volo.Abp.AspNetCore.Components.Web.BasicTheme.Themes.Basic;

public class MenuViewModel
{
    public ApplicationMenu Menu { get; set; }

    public List<MenuItemViewModel> Items { get; set; }

    public EventHandler StateChanged;

    public void SetParents()
    {
        foreach (var item in Items)
        {
            item.SetParents(null);
        }
    }

    public void ToggleOpen(MenuItemViewModel menuItem)
    {
        if (menuItem.IsOpen)
        {
            menuItem.Close();
        }
        else
        {
            CloseAll();
            menuItem.Open();
        }

        StateChanged.InvokeSafely(this);
    }

    public void CloseAll()
    {
        foreach (var item in Items)
        {
            item.Close();
        }
    }

    public void InvokeStateChanged()
    {
        StateChanged.InvokeSafely(this);
    }
}
