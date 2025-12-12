import React from 'react'
import { useApp } from '../context/AppContext'
import GroupsList from './GroupsList'
import GroupDetail from './GroupDetail'

export default function Groups() {
  const { selectedGroup, setSelectedGroup } = useApp()

  // Si hay un grupo seleccionado, mostrar su detalle
  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
      />
    )
  }

  // Si no, mostrar la lista de grupos
  return <GroupsList />
}
